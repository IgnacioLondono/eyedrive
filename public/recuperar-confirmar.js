const authMessage = document.getElementById("authMessage");
const resetConfirmForm = document.getElementById("resetConfirmForm");
const resetConfirmBtn = document.getElementById("resetConfirmBtn");
const resetEmailLabel = document.getElementById("resetEmailLabel");

const resetEmail = sessionStorage.getItem("eyedrive.resetEmail");

if (!resetEmail) {
  window.location.href = "/recuperar.html";
}

if (resetEmailLabel && resetEmail) {
  resetEmailLabel.textContent = resetEmail;
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
    const res = await fetch("/api/auth/me", window.EyeAuth.fetchOpts());
    if (res.ok) window.location.replace("/");
  } catch {}
}

resetConfirmForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();

  const code = document.getElementById("resetCode").value.trim();
  const newPassword = document.getElementById("resetPassword").value;
  const confirmPassword = document.getElementById("resetPasswordConfirm").value;

  if (newPassword !== confirmPassword) {
    showMessage("Las contraseñas no coinciden.", "error");
    return;
  }

  if (resetConfirmBtn) {
    resetConfirmBtn.disabled = true;
    resetConfirmBtn.textContent = "Guardando…";
  }

  try {
    const res = await fetch(
      "/api/auth/password/confirm",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: JSON.stringify({ email: resetEmail, code, newPassword, confirmPassword }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo restablecer la contraseña");

    window.EyeAuth.applySessionFromResponse(data);
    sessionStorage.removeItem("eyedrive.resetEmail");
    window.location.replace("/");
  } catch (e) {
    showMessage(e.message, "error");
    if (resetConfirmBtn) {
      resetConfirmBtn.disabled = false;
      resetConfirmBtn.textContent = "Guardar y entrar";
    }
  }
});

document.getElementById("resetResendBtn")?.addEventListener("click", async () => {
  hideMessage();
  try {
    const res = await fetch(
      "/api/auth/password/resend",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: JSON.stringify({ email: resetEmail }),
      })
    );
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
