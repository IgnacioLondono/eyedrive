const crypto = require("crypto");
const { authenticator } = require("otplib");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");

authenticator.options = { window: 1 };

const BACKUP_CODE_COUNT = 8;
const PENDING_2FA_MINUTES = 5;
const APP_NAME = "Eyedrive";

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  const cleaned = digits.startsWith("+") ? `+${digits.slice(1).replace(/\D/g, "")}` : digits.replace(/\D/g, "");
  if (cleaned.startsWith("+")) {
    const n = cleaned.slice(1);
    if (n.length < 8 || n.length > 15) return null;
    return cleaned;
  }
  if (cleaned.length < 8 || cleaned.length > 15) return null;
  return cleaned;
}

function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const part = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${part.slice(0, 4)}-${part.slice(4, 8)}`);
  }
  return codes;
}

async function hashBackupCode(code) {
  return bcrypt.hash(String(code).replace(/\s+/g, "").toUpperCase(), 10);
}

async function verifyBackupCode(code, hash) {
  return bcrypt.compare(String(code).replace(/\s+/g, "").toUpperCase(), hash);
}

function pending2faExpiry() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + PENDING_2FA_MINUTES);
  return d;
}

async function countBackupCodes(pool, userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM user_backup_codes
     WHERE user_id = $1::uuid AND used_at IS NULL`,
    [userId]
  );
  return rows[0]?.n || 0;
}

async function createBackupCodes(pool, userId) {
  await pool.query(`DELETE FROM user_backup_codes WHERE user_id = $1::uuid`, [userId]);
  const plain = generateBackupCodes();
  for (const code of plain) {
    const codeHash = await hashBackupCode(code);
    await pool.query(
      `INSERT INTO user_backup_codes (user_id, code_hash) VALUES ($1::uuid, $2)`,
      [userId, codeHash]
    );
  }
  return plain;
}

async function consumeBackupCode(pool, userId, code) {
  const { rows } = await pool.query(
    `SELECT id, code_hash FROM user_backup_codes
     WHERE user_id = $1::uuid AND used_at IS NULL`,
    [userId]
  );
  for (const row of rows) {
    if (await verifyBackupCode(code, row.code_hash)) {
      await pool.query(`UPDATE user_backup_codes SET used_at = NOW() WHERE id = $1`, [row.id]);
      return true;
    }
  }
  return false;
}

async function verifyTotpCode(secret, code) {
  if (!secret || !/^\d{6}$/.test(String(code || "").trim())) return false;
  return authenticator.verify({ token: String(code).trim(), secret });
}

async function buildTotpSetup(email, secret) {
  const otpauthUrl = authenticator.keyuri(email, APP_NAME, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
  return { otpauthUrl, qrDataUrl, secret };
}

function mountTwoFactorRoutes(app, pool, deps) {
  const {
    requireAuth,
    verifyPassword,
    hashPassword,
    createSession,
    setSessionCookie,
    storeEmailCode,
    verifyEmailCode,
    sendVerificationCode,
    emailSendError,
  } = deps;

  app.get("/api/auth/2fa", requireAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT totp_enabled, phone, totp_pending_secret IS NOT NULL AS setup_pending
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
      const backupRemaining = await countBackupCodes(pool, req.user.id);
      res.json({
        enabled: Boolean(rows[0].totp_enabled),
        phone: rows[0].phone || "",
        setupPending: Boolean(rows[0].setup_pending),
        backupCodesRemaining: backupRemaining,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo cargar la configuración 2FA" });
    }
  });

  app.patch("/api/auth/2fa/phone", requireAuth, async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    if (req.body?.phone && phone === null) {
      return res.status(400).json({ error: "Número de teléfono no válido" });
    }
    try {
      await pool.query(`UPDATE users SET phone = $2, updated_at = NOW() WHERE id = $1`, [
        req.user.id,
        phone || null,
      ]);
      res.json({ ok: true, phone: phone || "" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo guardar el teléfono" });
    }
  });

  app.post("/api/auth/2fa/setup", requireAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT email, totp_enabled FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
      if (rows[0].totp_enabled) {
        return res.status(400).json({ error: "La verificación en 2 pasos ya está activa" });
      }
      const secret = authenticator.generateSecret();
      await pool.query(
        `UPDATE users SET totp_pending_secret = $2, updated_at = NOW() WHERE id = $1`,
        [req.user.id, secret]
      );
      const setup = await buildTotpSetup(rows[0].email, secret);
      res.json(setup);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo iniciar la configuración 2FA" });
    }
  });

  app.post("/api/auth/2fa/enable", requireAuth, async (req, res) => {
    const code = String(req.body?.code || "").trim();
    const password = String(req.body?.password || "");
    if (!/^\d{6}$/.test(code) || !password) {
      return res.status(400).json({ error: "Código y contraseña requeridos" });
    }
    try {
      const { rows } = await pool.query(
        `SELECT password_hash, totp_pending_secret, totp_enabled FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
      if (rows[0].totp_enabled) {
        return res.status(400).json({ error: "La verificación en 2 pasos ya está activa" });
      }
      if (!rows[0].totp_pending_secret) {
        return res.status(400).json({ error: "Primero inicia la configuración 2FA" });
      }
      const validPass = await verifyPassword(password, rows[0].password_hash);
      if (!validPass) return res.status(401).json({ error: "Contraseña incorrecta" });
      const validTotp = await verifyTotpCode(rows[0].totp_pending_secret, code);
      if (!validTotp) return res.status(400).json({ error: "Código de la app incorrecto" });

      await pool.query(
        `UPDATE users SET totp_secret = $2, totp_pending_secret = NULL, totp_enabled = TRUE, updated_at = NOW()
         WHERE id = $1`,
        [req.user.id, rows[0].totp_pending_secret]
      );
      const backupCodes = await createBackupCodes(pool, req.user.id);
      res.json({ ok: true, backupCodes });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo activar la verificación en 2 pasos" });
    }
  });

  app.post("/api/auth/2fa/disable", requireAuth, async (req, res) => {
    const code = String(req.body?.code || "").trim();
    const password = String(req.body?.password || "");
    if (!code || !password) {
      return res.status(400).json({ error: "Código y contraseña requeridos" });
    }
    try {
      const { rows } = await pool.query(
        `SELECT password_hash, totp_secret, totp_enabled FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!rows.length || !rows[0].totp_enabled) {
        return res.status(400).json({ error: "La verificación en 2 pasos no está activa" });
      }
      const validPass = await verifyPassword(password, rows[0].password_hash);
      if (!validPass) return res.status(401).json({ error: "Contraseña incorrecta" });

      let validCode =
        (await verifyTotpCode(rows[0].totp_secret, code)) ||
        (await consumeBackupCode(pool, req.user.id, code));
      if (!validCode) return res.status(400).json({ error: "Código incorrecto" });

      await pool.query(
        `UPDATE users SET totp_secret = NULL, totp_pending_secret = NULL, totp_enabled = FALSE, updated_at = NOW()
         WHERE id = $1`,
        [req.user.id]
      );
      await pool.query(`DELETE FROM user_backup_codes WHERE user_id = $1::uuid`, [req.user.id]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo desactivar la verificación en 2 pasos" });
    }
  });

  app.post("/api/auth/2fa/backup/regenerate", requireAuth, async (req, res) => {
    const code = String(req.body?.code || "").trim();
    const password = String(req.body?.password || "");
    if (!code || !password) {
      return res.status(400).json({ error: "Código y contraseña requeridos" });
    }
    try {
      const { rows } = await pool.query(
        `SELECT password_hash, totp_secret, totp_enabled FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!rows.length || !rows[0].totp_enabled) {
        return res.status(400).json({ error: "La verificación en 2 pasos no está activa" });
      }
      const validPass = await verifyPassword(password, rows[0].password_hash);
      if (!validPass) return res.status(401).json({ error: "Contraseña incorrecta" });
      const validTotp = await verifyTotpCode(rows[0].totp_secret, code);
      if (!validTotp) return res.status(400).json({ error: "Código de la app incorrecto" });

      const backupCodes = await createBackupCodes(pool, req.user.id);
      res.json({ ok: true, backupCodes });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudieron regenerar los códigos de respaldo" });
    }
  });

  app.post("/api/auth/login/2fa/email", async (req, res) => {
    const pendingToken = String(req.body?.pendingToken || "").trim();
    if (!/^[0-9a-f]{64}$/i.test(pendingToken)) {
      return res.status(400).json({ error: "Sesión de verificación no válida" });
    }
    try {
      const { rows } = await pool.query(
        `SELECT p.user_id, u.email, u.totp_enabled
         FROM pending_2fa_logins p
         JOIN users u ON u.id = p.user_id
         WHERE p.token = $1 AND p.expires_at > NOW()`,
        [pendingToken]
      );
      if (!rows.length || !rows[0].totp_enabled) {
        return res.status(400).json({ error: "Sesión de verificación caducada" });
      }
      const code = await storeEmailCode(pool, rows[0].email, "2fa_login");
      await sendVerificationCode(rows[0].email, code, "2fa_login");
      res.json({ ok: true, message: "Código enviado a tu correo" });
    } catch (e) {
      return emailSendError(res, e);
    }
  });

  app.post("/api/auth/login/2fa", async (req, res) => {
    const pendingToken = String(req.body?.pendingToken || "").trim();
    const code = String(req.body?.code || "").trim();
    const method = String(req.body?.method || "totp").trim();
    if (!/^[0-9a-f]{64}$/i.test(pendingToken) || !code) {
      return res.status(400).json({ error: "Datos no válidos" });
    }
    try {
      const { rows } = await pool.query(
        `SELECT p.user_id, u.id, u.email, u.display_name, u.email_verified, u.totp_secret, u.totp_enabled
         FROM pending_2fa_logins p
         JOIN users u ON u.id = p.user_id
         WHERE p.token = $1 AND p.expires_at > NOW()`,
        [pendingToken]
      );
      if (!rows.length || !rows[0].totp_enabled) {
        return res.status(400).json({ error: "Sesión de verificación caducada. Vuelve a iniciar sesión." });
      }
      const user = rows[0];
      let ok = false;
      if (method === "email") {
        if (!/^\d{6}$/.test(code)) {
          return res.status(400).json({ error: "Código no válido" });
        }
        ok = await verifyEmailCode(pool, user.email, code, "2fa_login");
      } else if (method === "backup") {
        ok = await consumeBackupCode(pool, user.id, code);
      } else {
        ok = await verifyTotpCode(user.totp_secret, code);
      }
      if (!ok) return res.status(400).json({ error: "Código incorrecto" });

      await pool.query(`DELETE FROM pending_2fa_logins WHERE token = $1`, [pendingToken]);
      await provisionUserDriveSafe(pool, user.id);
      const token = await createSession(pool, user.id);
      setSessionCookie(req, res, token);
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.display_name || "",
        emailVerified: user.email_verified,
        sessionToken: token,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo completar el inicio de sesión" });
    }
  });
}

async function provisionUserDriveSafe(pool, userId) {
  const { rows } = await pool.query(`SELECT id FROM items WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  if (rows.length) return;
  for (const name of ["Documentos", "Imágenes", "Descargas"]) {
    await pool.query(
      `INSERT INTO items (user_id, parent_id, name, type, size) VALUES ($1::uuid, NULL, $2, 'folder', 0)`,
      [userId, name]
    );
  }
}

async function startPending2faLogin(pool, userId) {
  const pendingToken = crypto.randomBytes(32).toString("hex");
  await pool.query(`DELETE FROM pending_2fa_logins WHERE user_id = $1::uuid`, [userId]);
  await pool.query(
    `INSERT INTO pending_2fa_logins (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [pendingToken, userId, pending2faExpiry()]
  );
  return pendingToken;
}

module.exports = {
  mountTwoFactorRoutes,
  normalizePhone,
  verifyTotpCode,
  startPending2faLogin,
};
