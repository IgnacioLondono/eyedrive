const { Resend } = require("resend");

const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const RESEND_FROM = String(process.env.RESEND_FROM || "").trim();

let client = null;
let startupLogged = false;

function isPlaceholder(value) {
  const v = String(value || "").toLowerCase();
  return (
    !v ||
    v.includes("re_xxxx") ||
    v.includes("example.com") ||
    v.includes("tu-dominio") ||
    v.includes("tu-correo") ||
    v === "eyedrive"
  );
}

function isEmailConfigured() {
  return Boolean(
    RESEND_API_KEY &&
      RESEND_API_KEY.startsWith("re_") &&
      RESEND_FROM &&
      RESEND_FROM.includes("@") &&
      !isPlaceholder(RESEND_API_KEY) &&
      !isPlaceholder(RESEND_FROM)
  );
}

function resolveFromAddress() {
  if (RESEND_FROM.includes("<")) return RESEND_FROM;
  return `Eyedrive <${RESEND_FROM}>`;
}

function getClient() {
  if (!RESEND_API_KEY) return null;
  if (!client) client = new Resend(RESEND_API_KEY);
  if (!startupLogged) {
    startupLogged = true;
    if (isEmailConfigured()) {
      console.log(`[email] Resend activo → ${resolveFromAddress()}`);
    } else {
      console.warn("[email] Configura RESEND_API_KEY y RESEND_FROM (dominio verificado en Resend).");
    }
  }
  return client;
}

async function sendVerificationCode(email, code, purpose) {
  const subjects = {
    register: "Confirma tu correo en Eyedrive",
    reset: "Restablece tu contraseña en Eyedrive",
    login: "Tu código de acceso a Eyedrive",
  };
  const intros = {
    register: "Usa este código para confirmar tu correo y crear tu cuenta:",
    reset: "Usa este código para restablecer tu contraseña en Eyedrive:",
    login: "Usa este código para completar tu inicio de sesión en Eyedrive:",
  };
  const subject = subjects[purpose] || "Tu código de acceso a Eyedrive";
  const intro = intros[purpose] || "Usa este código para iniciar sesión en Eyedrive:";

  const spamNote =
    "Si no lo ves en unos minutos, revisa la carpeta de spam o correo no deseado.";
  const text = `${intro}\n\n${code}\n\nEl código caduca en 15 minutos. ${spamNote}\n\nSi no lo solicitaste, ignora este mensaje.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#6d5bfd;margin:0 0 16px">Eyedrive</h2>
      <p style="color:#333;line-height:1.5">${intro}</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#0f0f12;margin:24px 0">${code}</p>
      <p style="color:#666;font-size:14px">El código caduca en 15 minutos.</p>
      <p style="color:#666;font-size:14px">${spamNote}</p>
    </div>`;

  const resend = getClient();
  if (!resend || !isEmailConfigured()) {
    console.warn(`[email] Resend no configurado. Código para ${email}: ${code}`);
    return { ok: true, dev: true };
  }

  const { data, error } = await resend.emails.send({
    from: resolveFromAddress(),
    to: email,
    subject,
    text,
    html,
  });

  if (error) {
    console.error("[email] Resend:", error.message || error);
    const err = new Error(error.message || "No se pudo enviar el correo");
    err.code = "EMAIL_SEND_FAILED";
    throw err;
  }

  if (data?.id) {
    console.log(`[email] Enviado a ${email} (${data.id})`);
  }
  return { ok: true, dev: false };
}

module.exports = { isEmailConfigured, sendVerificationCode };
