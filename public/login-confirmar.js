const authMessage = document.getElementById("authMessage");
const loginConfirmForm = document.getElementById("loginConfirmForm");
const loginConfirmBtn = document.getElementById("loginConfirmBtn");
const loginEmailLabel = document.getElementById("loginEmailLabel");

const loginEmail = sessionStorage.getItem("eyedrive.loginEmail");

if (!loginEmail) {
  window.location.href = "/login.html";
}

if (loginEmailLabel && loginEmail) {
  loginEmailLabel.textContent = loginEmail;
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

loginConfirmForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();
  const code = document.getElementById("loginCode").value.trim();

  if (loginConfirmBtn) {
    loginConfirmBtn.disabled = true;
    loginConfirmBtn.textContent = "Entrando…";
  }

  try {
    const res = await fetch(
      "/api/auth/login/confirm",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: JSON.stringify({ email: loginEmail, code }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Código incorrecto");

    window.EyeAuth.applySessionFromResponse(data);
    sessionStorage.removeItem("eyedrive.loginEmail");
    window.location.replace("/");
  } catch (e) {
    showMessage(e.message, "error");
    if (loginConfirmBtn) {
      loginConfirmBtn.disabled = false;
      loginConfirmBtn.textContent = "Entrar";
    }
  }
});

document.getElementById("loginResendBtn")?.addEventListener("click", async () => {
  hideMessage();
  try {
    const res = await fetch(
      "/api/auth/login/resend",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: JSON.stringify({ email: loginEmail }),
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
