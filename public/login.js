const authMessage = document.getElementById("authMessage");
const loginForm = document.getElementById("loginForm");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const fetchOpts = { credentials: "include", headers: { "Content-Type": "application/json" } };

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

loginForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (loginSubmitBtn) {
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = "Entrando…";
  }

  try {
    const res = await fetch("/api/auth/login", {
      ...fetchOpts,
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");
    window.location.href = "/";
  } catch (e) {
    showMessage(e.message, "error");
    if (loginSubmitBtn) {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = "Entrar";
    }
  }
});

if (window.EyeIcons) {
  const brand = document.getElementById("brandIcon");
  if (brand) brand.innerHTML = window.EyeIcons.eye();
}
checkAlreadyLoggedIn();
