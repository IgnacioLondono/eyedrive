const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const SESSION_COOKIE = "eyedrive_session";
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);
const CODE_TTL_MINUTES = 15;
const PENDING_TTL_HOURS = 24;
const APP_URL = (process.env.APP_URL || "http://localhost:9990").replace(/\/$/, "");
const BCRYPT_ROUNDS = 12;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return EMAIL_RE.test(email) && email.length <= 254;
}

function validatePassword(password) {
  const p = String(password || "");
  if (p.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (p.length > 128) return "La contraseña es demasiado larga";
  return null;
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

function generateSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

function sessionExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

function codeExpiryDate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + CODE_TTL_MINUTES);
  return d;
}

function pendingExpiryDate() {
  const d = new Date();
  d.setHours(d.getHours() + PENDING_TTL_HOURS);
  return d;
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60 * 1000;
  const secure = APP_URL.startsWith("https");
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge,
    path: "/",
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

function createAuthMiddleware(pool) {
  return async function loadSession(req, res, next) {
    const token = req.cookies?.[SESSION_COOKIE];
    req.user = null;
    if (!token) return next();
    try {
      const { rows } = await pool.query(
        `SELECT u.id, u.email, u.display_name, u.email_verified, u.created_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        [token]
      );
      if (rows.length) {
        req.user = {
          id: rows[0].id,
          email: rows[0].email,
          displayName: rows[0].display_name || "",
          emailVerified: rows[0].email_verified,
          createdAt: rows[0].created_at,
        };
        req.sessionToken = token;
      }
    } catch (e) {
      console.error(e);
    }
    next();
  };
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Inicia sesión para continuar" });
  }
  next();
}

async function createSession(pool, userId) {
  const token = generateSessionToken();
  const expiresAt = sessionExpiryDate();
  await pool.query(`INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`, [
    userId,
    token,
    expiresAt,
  ]);
  return token;
}

async function destroySession(pool, token) {
  if (!token) return;
  await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

async function storeEmailCode(pool, email, purpose) {
  await pool.query(
    `UPDATE email_codes SET used_at = NOW()
     WHERE email = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()`,
    [email, purpose]
  );
  const code = generateCode();
  const expiresAt = codeExpiryDate();
  await pool.query(
    `INSERT INTO email_codes (email, code, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
    [email, code, purpose, expiresAt]
  );
  return code;
}

async function verifyEmailCode(pool, email, code, purpose) {
  const { rows } = await pool.query(
    `SELECT id FROM email_codes
     WHERE email = $1 AND code = $2 AND purpose = $3
       AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, code, purpose]
  );
  if (!rows.length) return false;
  await pool.query(`UPDATE email_codes SET used_at = NOW() WHERE id = $1`, [rows[0].id]);
  return true;
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

function emailSendError(res, e) {
  console.error(e);
  if (e.code === "EAUTH") {
    return res.status(503).json({
      error: "El servidor no puede enviar correos. Revisa la configuración SMTP.",
    });
  }
  return res.status(500).json({ error: "No se pudo enviar el código" });
}

function mountAuthRoutes(app, pool, { sendVerificationCode }) {
  const loadSession = createAuthMiddleware(pool);

  app.use(loadSession);

  app.get("/api/auth/me", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "No autenticado" });
    res.json({
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      emailVerified: req.user.emailVerified,
    });
  });

  app.post("/api/auth/register/request", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const displayName = String(req.body?.displayName || "").trim().slice(0, 80);
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Correo no válido" });
    }
    if (!displayName) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    const passErr = validatePassword(password);
    if (passErr) return res.status(400).json({ error: passErr });
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Las contraseñas no coinciden" });
    }

    try {
      const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (rows.length) {
        return res.status(409).json({ error: "Este correo ya está registrado. Inicia sesión." });
      }

      const passwordHash = await hashPassword(password);
      const expiresAt = pendingExpiryDate();
      await pool.query(
        `INSERT INTO pending_registrations (email, display_name, password_hash, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           password_hash = EXCLUDED.password_hash,
           created_at = NOW(),
           expires_at = EXCLUDED.expires_at`,
        [email, displayName, passwordHash, expiresAt]
      );

      const code = await storeEmailCode(pool, email, "register");
      await sendVerificationCode(email, code, "register");
      res.json({ ok: true, email, message: "Te hemos enviado un código de confirmación" });
    } catch (e) {
      return emailSendError(res, e);
    }
  });

  app.post("/api/auth/register/confirm", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();
    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Datos no válidos" });
    }
    try {
      const ok = await verifyEmailCode(pool, email, code, "register");
      if (!ok) return res.status(400).json({ error: "Código incorrecto o caducado" });

      const { rows: existing } = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (existing.length) {
        return res.status(409).json({ error: "Este correo ya está registrado" });
      }

      const { rows: pending } = await pool.query(
        `SELECT display_name, password_hash FROM pending_registrations
         WHERE email = $1 AND expires_at > NOW()`,
        [email]
      );
      if (!pending.length) {
        return res.status(400).json({
          error: "No hay un registro pendiente. Vuelve a rellenar el formulario.",
        });
      }

      const { rows } = await pool.query(
        `INSERT INTO users (email, email_verified, display_name, password_hash)
         VALUES ($1, TRUE, $2, $3)
         RETURNING id, email, display_name, email_verified`,
        [email, pending[0].display_name, pending[0].password_hash]
      );
      await pool.query(`DELETE FROM pending_registrations WHERE email = $1`, [email]);

      const user = rows[0];
      const token = await createSession(pool, user.id);
      setSessionCookie(res, token);
      res.status(201).json({
        id: user.id,
        email: user.email,
        displayName: user.display_name || "",
        emailVerified: user.email_verified,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo crear la cuenta" });
    }
  });

  app.post("/api/auth/register/resend", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Correo no válido" });
    }
    try {
      const { rows } = await pool.query(
        `SELECT email FROM pending_registrations WHERE email = $1 AND expires_at > NOW()`,
        [email]
      );
      if (!rows.length) {
        return res.status(400).json({ error: "No hay registro pendiente para este correo" });
      }
      const code = await storeEmailCode(pool, email, "register");
      await sendVerificationCode(email, code, "register");
      res.json({ ok: true, message: "Código reenviado" });
    } catch (e) {
      return emailSendError(res, e);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: "Correo y contraseña requeridos" });
    }
    try {
      const { rows } = await pool.query(
        `SELECT id, email, display_name, email_verified, password_hash FROM users WHERE email = $1`,
        [email]
      );
      if (!rows.length) {
        return res.status(401).json({ error: "Correo o contraseña incorrectos" });
      }
      const user = rows[0];
      if (!user.email_verified) {
        return res.status(403).json({ error: "Confirma tu correo antes de iniciar sesión" });
      }
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Correo o contraseña incorrectos" });
      }

      const token = await createSession(pool, user.id);
      setSessionCookie(res, token);
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.display_name || "",
        emailVerified: user.email_verified,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo iniciar sesión" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      await destroySession(pool, req.sessionToken);
    } catch (e) {
      console.error(e);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.patch("/api/auth/account", requireAuth, async (req, res) => {
    const displayName = String(req.body?.displayName || "").trim().slice(0, 80);
    if (!displayName) {
      return res.status(400).json({ error: "Nombre requerido" });
    }
    try {
      const { rows } = await pool.query(
        `UPDATE users SET display_name = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, display_name, email_verified`,
        [req.user.id, displayName]
      );
      res.json({
        id: rows[0].id,
        email: rows[0].email,
        displayName: rows[0].display_name,
        emailVerified: rows[0].email_verified,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo actualizar la cuenta" });
    }
  });

  app.patch("/api/auth/account/password", requireAuth, async (req, res) => {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    const confirmPassword = String(req.body?.confirmPassword || "");
    const passErr = validatePassword(newPassword);
    if (passErr) return res.status(400).json({ error: passErr });
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Las contraseñas nuevas no coinciden" });
    }
    try {
      const { rows } = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
      if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
      const valid = await verifyPassword(currentPassword, rows[0].password_hash);
      if (!valid) return res.status(401).json({ error: "Contraseña actual incorrecta" });
      const passwordHash = await hashPassword(newPassword);
      await pool.query(`UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [
        req.user.id,
        passwordHash,
      ]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo cambiar la contraseña" });
    }
  });

  app.delete("/api/auth/sessions", requireAuth, async (req, res) => {
    try {
      await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [req.user.id]);
      clearSessionCookie(res);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error al cerrar sesiones" });
    }
  });

  return { requireAuth, loadSession, SESSION_COOKIE };
}

module.exports = {
  mountAuthRoutes,
  requireAuth,
  createAuthMiddleware,
  normalizeEmail,
  isValidEmail,
  SESSION_COOKIE,
};
