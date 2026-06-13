const { Resend } = require("resend");

const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const RESEND_FROM = String(process.env.RESEND_FROM || "").trim();
const APP_URL = (process.env.APP_URL || "http://localhost:9990").replace(/\/$/, "");

const BRAND = {
  from: "#9B7BF7",
  to: "#6D28D9",
  text: "#0f0f12",
  muted: "#5c5c66",
  border: "#e8e6f0",
  panel: "#f7f6fb",
};

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildVerificationEmail(purpose, code) {
  const subjects = {
    register: "Confirma tu correo en Eyedrive",
    reset: "Restablece tu contraseña en Eyedrive",
    login: "Tu código de acceso a Eyedrive",
  };
  const titles = {
    register: "Confirma tu correo",
    reset: "Restablece tu contraseña",
    login: "Código de acceso",
  };
  const intros = {
    register: "Introduce este código para confirmar tu correo y crear tu cuenta en Eyedrive.",
    reset: "Introduce este código para restablecer la contraseña de tu cuenta.",
    login: "Introduce este código para completar tu inicio de sesión en Eyedrive.",
  };
  const subject = subjects[purpose] || subjects.login;
  const title = titles[purpose] || titles.login;
  const intro = intros[purpose] || intros.login;
  const safeCode = escapeHtml(code);
  const spamNote =
    "Si no lo ves en unos minutos, revisa la carpeta de spam o correo no deseado.";

  const text = [
    title,
    "",
    intro,
    "",
    code,
    "",
    "El código caduca en 15 minutos.",
    spamNote,
    "",
    "Si no solicitaste este mensaje, puedes ignorarlo con seguridad.",
    "",
    APP_URL,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eceaf4;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${BRAND.text};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eceaf4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,15,18,0.08);">
          <tr>
            <td style="height:6px;background:linear-gradient(90deg,${BRAND.from},${BRAND.to});font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,${BRAND.from},${BRAND.to});text-align:center;vertical-align:middle;color:#fff;font-weight:700;font-size:18px;">E</td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <div style="font-size:18px;font-weight:700;line-height:1.2;">Eyedrive</div>
                    <div style="font-size:13px;color:${BRAND.muted};margin-top:2px;">Tu nube personal</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;font-weight:700;">${escapeHtml(title)}</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(intro)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.panel};border:1px solid ${BRAND.border};border-radius:16px;">
                <tr>
                  <td style="padding:22px 16px;text-align:center;">
                    <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};margin-bottom:10px;">Tu código</div>
                    <div style="font-size:36px;font-weight:800;letter-spacing:0.28em;color:${BRAND.text};font-variant-numeric:tabular-nums;">${safeCode}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${BRAND.muted};">Caduca en <strong style="color:${BRAND.text};">15 minutos</strong>.</p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(spamNote)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ${BRAND.border};">
                <tr>
                  <td style="padding-top:18px;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                    Si no solicitaste este mensaje, ignóralo. Nadie podrá acceder a tu cuenta sin tu contraseña.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <a href="${escapeHtml(APP_URL)}" style="display:inline-block;font-size:13px;font-weight:600;color:${BRAND.to};text-decoration:none;">Abrir Eyedrive →</a>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:${BRAND.muted};">© Eyedrive</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function sendVerificationCode(email, code, purpose) {
  const { subject, text, html } = buildVerificationEmail(purpose, code);

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

module.exports = { isEmailConfigured, sendVerificationCode, buildVerificationEmail };
