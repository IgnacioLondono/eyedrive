const authMessage = document.getElementById("authMessage");
const loginForm = document.getElementById("loginForm");
const loginConfirmForm = document.getElementById("loginConfirmForm");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginConfirmBtn = document.getElementById("loginConfirmBtn");
const loginStepCredentials = document.getElementById("loginStepCredentials");
const loginStepCode = document.getElementById("loginStepCode");
const loginStepLabel1 = document.getElementById("loginStepLabel1");
const loginStepLabel2 = document.getElementById("loginStepLabel2");
const loginStepsBar = document.getElementById("loginStepsBar");
const loginEmailLabel = document.getElementById("loginEmailLabel");
const loginEmailInput = document.getElementById("loginEmail");
const loginCodeInput = document.getElementById("loginCode");

const LOGIN_EMAIL_KEY = "eyedrive.loginEmail";
let pendingLoginEmail = sessionStorage.getItem(LOGIN_EMAIL_KEY) || "";

function showMessage(text, type = "info") {
  if (!authMessage) return;
  authMessage.hidden = false;
  authMessage.textContent = text;
  authMessage.className = `auth-message auth-message--${type}`;
}

function hideMessage() {
  if (authMessage) authMessage.hidden = true;
}

function setLoginStep(step) {
  const onCode = step === "code";
  if (loginStepsBar) loginStepsBar.hidden = !onCode;
  if (loginStepCredentials) loginStepCredentials.hidden = onCode;
  if (loginStepCode) loginStepCode.hidden = !onCode;
  loginStepLabel1?.classList.toggle("auth-step--active", !onCode);
  loginStepLabel1?.classList.toggle("auth-step--done", onCode);
  loginStepLabel2?.classList.toggle("auth-step--active", onCode);
  if (onCode) {
    loginCodeInput?.focus();
  } else {
    loginEmailInput?.focus();
  }
}

function showCodeStep(email) {
  pendingLoginEmail = email;
  sessionStorage.setItem(LOGIN_EMAIL_KEY, email);
  if (loginEmailLabel) loginEmailLabel.textContent = email;
  if (loginEmailInput) loginEmailInput.value = email;
  if (loginCodeInput) loginCodeInput.value = "";
  setLoginStep("code");
  hideMessage();
}

function showCredentialsStep() {
  pendingLoginEmail = "";
  sessionStorage.removeItem(LOGIN_EMAIL_KEY);
  if (loginCodeInput) loginCodeInput.value = "";
  setLoginStep("credentials");
  hideMessage();
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

  const email = loginEmailInput?.value.trim() || "";
  const password = document.getElementById("loginPassword")?.value || "";

  if (loginSubmitBtn) {
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = "Entrando…";
  }

  try {
    const res = await fetch(
      "/api/auth/login",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: window.EyeAuth.authJsonBody({ email, password }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");

    if (data.sessionToken) {
      window.EyeAuth.applySessionFromResponse(data);
      sessionStorage.removeItem(LOGIN_EMAIL_KEY);
      window.location.replace("/");
      return;
    }

    if (!data.needsCode) {
      throw new Error("No se pudo completar el inicio de sesión");
    }

    showCodeStep(data.email || email);
    showMessage(data.message || "Te hemos enviado un código a tu correo.", "success");
  } catch (e) {
    showMessage(e.message, "error");
  } finally {
    if (loginSubmitBtn) {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = "Entrar";
    }
  }
});

loginConfirmForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();

  const code = loginCodeInput?.value.trim() || "";
  if (!pendingLoginEmail) {
    showCredentialsStep();
    showMessage("Vuelve a introducir tu correo y contraseña.", "error");
    return;
  }

  if (loginConfirmBtn) {
    loginConfirmBtn.disabled = true;
    loginConfirmBtn.textContent = "Entrando…";
  }

  try {
    const res = await fetch(
      "/api/auth/login/confirm",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: window.EyeAuth.authJsonBody({ email: pendingLoginEmail, code }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Código incorrecto");

    window.EyeAuth.applySessionFromResponse(data);
    sessionStorage.removeItem(LOGIN_EMAIL_KEY);
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
  if (!pendingLoginEmail) {
    showCredentialsStep();
    showMessage("Vuelve a introducir tu correo y contraseña.", "error");
    return;
  }

  try {
    const res = await fetch(
      "/api/auth/login/resend",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: window.EyeAuth.authJsonBody({ email: pendingLoginEmail }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo reenviar");
    showMessage("Te hemos enviado un código nuevo.", "success");
  } catch (e) {
    showMessage(e.message, "error");
  }
});

document.getElementById("loginBackBtn")?.addEventListener("click", () => {
  showCredentialsStep();
});

if (window.EyeIcons) {
  const brand = document.getElementById("brandIcon");
  if (brand) brand.innerHTML = window.EyeIcons.eye();
}

checkAlreadyLoggedIn();

const urlStep = new URLSearchParams(window.location.search).get("step");
if (urlStep === "code" && pendingLoginEmail) {
  showCodeStep(pendingLoginEmail);
} else if (urlStep === "code" && !pendingLoginEmail) {
  showCredentialsStep();
}
