const authMessage = document.getElementById("authMessage");
const loginForm = document.getElementById("loginForm");
const login2faForm = document.getElementById("login2faForm");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const login2faSubmitBtn = document.getElementById("login2faSubmitBtn");
const login2faMethod = document.getElementById("login2faMethod");
const login2faCode = document.getElementById("login2faCode");
const login2faCodeLabel = document.getElementById("login2faCodeLabel");
const login2faEmailBtn = document.getElementById("login2faEmailBtn");
const login2faBackBtn = document.getElementById("login2faBackBtn");
const authTitle = document.querySelector(".auth-card > .auth-title");
const authSubtitle = document.querySelector(".auth-card > .auth-subtitle");
const authSwitch = document.querySelector(".auth-switch");

let pending2faToken = "";

function showMessage(text, type = "info") {
  if (!authMessage) return;
  authMessage.hidden = false;
  authMessage.textContent = text;
  authMessage.className = `auth-message auth-message--${type}`;
}

function hideMessage() {
  if (authMessage) authMessage.hidden = true;
}

function update2faMethodUi() {
  const method = login2faMethod?.value || "totp";
  if (login2faEmailBtn) login2faEmailBtn.hidden = method !== "email";
  if (login2faCodeLabel) {
    login2faCodeLabel.textContent =
      method === "backup" ? "Código de respaldo" : method === "email" ? "Código del correo" : "Código de la app";
  }
  if (login2faCode) {
    login2faCode.placeholder = method === "backup" ? "XXXX-XXXX" : "000000";
    login2faCode.maxLength = method === "backup" ? 9 : 6;
  }
}

function show2faStep() {
  if (loginForm) loginForm.hidden = true;
  if (login2faForm) login2faForm.hidden = false;
  if (authTitle) authTitle.hidden = true;
  if (authSubtitle) authSubtitle.hidden = true;
  if (authSwitch) authSwitch.hidden = true;
  update2faMethodUi();
  login2faCode?.focus();
}

function hide2faStep() {
  pending2faToken = "";
  if (loginForm) loginForm.hidden = false;
  if (login2faForm) login2faForm.hidden = true;
  if (authTitle) authTitle.hidden = false;
  if (authSubtitle) authSubtitle.hidden = false;
  if (authSwitch) authSwitch.hidden = false;
  if (login2faCode) login2faCode.value = "";
}

async function checkAlreadyLoggedIn() {
  try {
    const res = await fetch("/api/auth/me", window.EyeAuth.fetchOpts());
    if (res.ok) window.location.replace("/");
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
    const res = await fetch(
      "/api/auth/login",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");

    if (data.requires2fa && data.pendingToken) {
      pending2faToken = data.pendingToken;
      show2faStep();
      return;
    }

    window.EyeAuth.applySessionFromResponse(data);
    window.location.replace("/");
  } catch (e) {
    showMessage(e.message, "error");
  } finally {
    if (loginSubmitBtn) {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = "Entrar";
    }
  }
});

login2faForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();
  const method = login2faMethod?.value || "totp";
  const code = login2faCode?.value.trim() || "";

  if (login2faSubmitBtn) {
    login2faSubmitBtn.disabled = true;
    login2faSubmitBtn.textContent = "Verificando…";
  }

  try {
    const res = await fetch(
      "/api/auth/login/2fa",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: JSON.stringify({ pendingToken: pending2faToken, code, method }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Código incorrecto");
    window.EyeAuth.applySessionFromResponse(data);
    window.location.replace("/");
  } catch (e) {
    showMessage(e.message, "error");
  } finally {
    if (login2faSubmitBtn) {
      login2faSubmitBtn.disabled = false;
      login2faSubmitBtn.textContent = "Verificar";
    }
  }
});

login2faMethod?.addEventListener("change", update2faMethodUi);

login2faEmailBtn?.addEventListener("click", async () => {
  hideMessage();
  try {
    const res = await fetch(
      "/api/auth/login/2fa/email",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: JSON.stringify({ pendingToken: pending2faToken }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo enviar el código");
    showMessage("Te hemos enviado un código a tu correo.", "success");
  } catch (e) {
    showMessage(e.message, "error");
  }
});

login2faBackBtn?.addEventListener("click", () => {
  hideMessage();
  hide2faStep();
});

if (window.EyeIcons) {
  const brand = document.getElementById("brandIcon");
  if (brand) brand.innerHTML = window.EyeIcons.eye();
}
checkAlreadyLoggedIn();
