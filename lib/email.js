const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@eyedrive.local";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

let transporter = null;

function isEmailConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

async function sendVerificationCode(email, code, purpose) {
  const tx = getTransporter();
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

  if (!tx) {
    console.warn(`[email] SMTP no configurado. Código para ${email}: ${code}`);
    return { ok: true, dev: true };
  }

  await tx.sendMail({ from: SMTP_FROM, to: email, subject, text, html });
  return { ok: true, dev: false };
}

module.exports = { isEmailConfigured, sendVerificationCode };
