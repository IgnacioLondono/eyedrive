const authMessage = document.getElementById("authMessage");
const confirmForm = document.getElementById("confirmForm");
const confirmSubmitBtn = document.getElementById("confirmSubmitBtn");
const confirmEmailEl = document.getElementById("confirmEmail");
const fetchOpts = { credentials: "include", headers: { "Content-Type": "application/json" } };

const pendingEmail = sessionStorage.getItem("eyedrive.pendingEmail");

if (!pendingEmail) {
  window.location.href = "/registro.html";
}

if (confirmEmailEl && pendingEmail) {
  confirmEmailEl.textContent = pendingEmail;
}

function showMessage(text, type = "info") {
  if (!authMessage) return;
  authMessage.hidden = false;
  authMessage.textContent = text;
  authMessage.className = `auth-message auth-message--${type}`;
}

function hideMessage() {
  if (authMessage) authMessage.hidden = true;
}

async function checkAlreadyLoggedIn() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) window.location.href = "/";
  } catch {}
}

confirmForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();
  const code = document.getElementById("confirmCode").value.trim();

  if (confirmSubmitBtn) {
    confirmSubmitBtn.disabled = true;
    confirmSubmitBtn.textContent = "Verificando…";
  }

  try {
    const res = await fetch("/api/auth/register/confirm", {
      ...fetchOpts,
      method: "POST",
      body: JSON.stringify({ email: pendingEmail, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Código incorrecto");

    sessionStorage.removeItem("eyedrive.pendingEmail");
    window.location.replace("/");
  } catch (e) {
    showMessage(e.message, "error");
    if (confirmSubmitBtn) {
      confirmSubmitBtn.disabled = false;
      confirmSubmitBtn.textContent = "Confirmar y entrar";
    }
  }
});

document.getElementById("resendBtn")?.addEventListener("click", async () => {
  hideMessage();
  try {
    const res = await fetch("/api/auth/register/resend", {
      ...fetchOpts,
      method: "POST",
      body: JSON.stringify({ email: pendingEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo reenviar");
    showMessage("Te hemos enviado un código nuevo.", "success");
  } catch (e) {
    showMessage(e.message, "error");
  }
});

if (window.EyeIcons) {
  const brand = document.getElementById("brandIcon");
  if (brand) brand.innerHTML = window.EyeIcons.eye();
}
checkAlreadyLoggedIn();
