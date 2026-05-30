const authMessage = document.getElementById("authMessage");
const loginView = document.getElementById("loginView");
const registerView = document.getElementById("registerView");
const loginForm = document.getElementById("loginForm");
const loginCodeForm = document.getElementById("loginCodeForm");
const loginCodeSection = document.getElementById("loginCodeSection");
const registerForm = document.getElementById("registerForm");
const registerCodeForm = document.getElementById("registerCodeForm");
const registerCodeSection = document.getElementById("registerCodeSection");

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

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { ...fetchOpts, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error de red");
  return data;
}

async function checkAlreadyLoggedIn() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) window.location.href = "/";
  } catch {}
}

document.getElementById("showRegisterBtn")?.addEventListener("click", () => {
  loginView.hidden = true;
  registerView.hidden = false;
  hideMessage();
});

document.getElementById("showLoginBtn")?.addEventListener("click", () => {
  registerView.hidden = true;
  loginView.hidden = false;
  hideMessage();
});

loginForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();
  const email = document.getElementById("loginEmail").value.trim();
  try {
    await apiFetch("/api/auth/login/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    loginCodeSection.hidden = false;
    showMessage("Revisa tu correo e introduce el código de 6 dígitos.", "success");
    document.getElementById("loginCode")?.focus();
  } catch (e) {
    showMessage(e.message, "error");
  }
});

loginCodeForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();
  const email = document.getElementById("loginEmail").value.trim();
  const code = document.getElementById("loginCode").value.trim();
  try {
    await apiFetch("/api/auth/login/confirm", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    window.location.href = "/";
  } catch (e) {
    showMessage(e.message, "error");
  }
});

document.getElementById("loginResendBtn")?.addEventListener("click", () => {
  loginForm.requestSubmit();
});

registerForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();
  const email = document.getElementById("registerEmail").value.trim();
  try {
    await apiFetch("/api/auth/register/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    registerCodeSection.hidden = false;
    showMessage("Te hemos enviado un código. Revísalo para confirmar tu correo.", "success");
    document.getElementById("registerCode")?.focus();
  } catch (e) {
    showMessage(e.message, "error");
  }
});

registerCodeForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();
  const email = document.getElementById("registerEmail").value.trim();
  const code = document.getElementById("registerCode").value.trim();
  const displayName = document.getElementById("registerName").value.trim();
  try {
    await apiFetch("/api/auth/register/confirm", {
      method: "POST",
      body: JSON.stringify({ email, code, displayName }),
    });
    window.location.href = "/";
  } catch (e) {
    showMessage(e.message, "error");
  }
});

document.getElementById("registerResendBtn")?.addEventListener("click", () => {
  registerForm.requestSubmit();
});

if (window.EyeIcons) {
  const brand = document.getElementById("brandIcon");
  if (brand) brand.innerHTML = window.EyeIcons.eye();
}
checkAlreadyLoggedIn();
