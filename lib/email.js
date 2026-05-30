const nodemailer = require("nodemailer");

const SMTP_HOST = String(process.env.SMTP_HOST || "").trim().toLowerCase();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
/* Gmail muestra la clave como "abcd efgh ijkl mnop"; quitamos espacios al copiar */
const SMTP_PASS = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
const SMTP_FROM_RAW = String(process.env.SMTP_FROM || "").trim();
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

let transporter = null;
let startupLogged = false;

function isPlaceholder(value) {
  const v = String(value || "").toLowerCase();
  return !v || v.includes("tu-correo") || v.includes("example.com") || v === "eyedrive";
}

function isEmailConfigured() {
  return Boolean(
    SMTP_HOST &&
      SMTP_USER &&
      SMTP_PASS &&
      !isPlaceholder(SMTP_USER) &&
      SMTP_PASS.length >= 16
  );
}

function resolveFromAddress() {
  if (SMTP_FROM_RAW && (SMTP_FROM_RAW.includes("@") || SMTP_FROM_RAW.includes("<"))) {
    return SMTP_FROM_RAW;
  }
  if (SMTP_USER) return `"Eyedrive" <${SMTP_USER}>`;
  return "Eyedrive <noreply@eyedrive.local>";
}

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    const isGmail = SMTP_HOST === "smtp.gmail.com" || SMTP_HOST.endsWith(".gmail.com");
    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        requireTLS: !SMTP_SECURE && SMTP_PORT === 587,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    }
  }
  if (!startupLogged) {
    startupLogged = true;
    const masked = SMTP_USER.replace(/(.{2}).*(@.*)/, "$1***$2");
    console.log(`[email] SMTP activo: ${masked} → ${SMTP_HOST}:${SMTP_PORT}`);
    if (isPlaceholder(SMTP_USER)) {
      console.warn("[email] SMTP_USER parece un valor de ejemplo, no un correo real.");
    }
    if (SMTP_PASS.length !== 16 && SMTP_HOST.includes("gmail")) {
      console.warn("[email] La contraseña de aplicación de Gmail suele tener 16 caracteres.");
    }
  }
  return transporter;
}

async function sendVerificationCode(email, code, purpose) {
  const subject =
    purpose === "register"
      ? "Confirma tu correo en Eyedrive"
      : "Tu código de acceso a Eyedrive";
  const intro =
    purpose === "register"
      ? "Usa este código para confirmar tu correo y crear tu cuenta:"
      : "Usa este código para iniciar sesión en Eyedrive:";

  const text = `${intro}\n\n${code}\n\nEl código caduca en 15 minutos. Si no lo solicitaste, ignora este mensaje.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#6d5bfd;margin:0 0 16px">Eyedrive</h2>
      <p style="color:#333;line-height:1.5">${intro}</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#0f0f12;margin:24px 0">${code}</p>
      <p style="color:#666;font-size:14px">El código caduca en 15 minutos.</p>
    </div>`;

  const tx = getTransporter();
  if (!tx) {
    console.warn(`[email] SMTP no configurado. Código para ${email}: ${code}`);
    return { ok: true, dev: true };
  }

  try {
    await tx.sendMail({ from: resolveFromAddress(), to: email, subject, text, html });
    return { ok: true, dev: false };
  } catch (e) {
    if (e.code === "EAUTH") {
      console.error(
        "[email] Gmail rechazó usuario/contraseña. Usa contraseña de aplicación: https://myaccount.google.com/apppasswords"
      );
      console.warn(`[email] Código de respaldo para ${email}: ${code}`);
      return { ok: true, dev: true, authFailed: true };
    }
    throw e;
  }
}

module.exports = { isEmailConfigured, sendVerificationCode };
