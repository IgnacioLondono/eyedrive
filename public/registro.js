const authMessage = document.getElementById("authMessage");
const registerForm = document.getElementById("registerForm");
const registerSubmitBtn = document.getElementById("registerSubmitBtn");

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

registerForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();

  const displayName = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerPasswordConfirm").value;

  if (password !== confirmPassword) {
    showMessage("Las contraseñas no coinciden.", "error");
    return;
  }
  if (password.length < 8) {
    showMessage("La contraseña debe tener al menos 8 caracteres.", "error");
    return;
  }

  if (registerSubmitBtn) {
    registerSubmitBtn.disabled = true;
    registerSubmitBtn.textContent = "Enviando código…";
  }

  try {
    const res = await fetch(
      "/api/auth/register/request",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: JSON.stringify({ displayName, email, password, confirmPassword }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error al registrar");

    sessionStorage.setItem("eyedrive.pendingEmail", email);
    window.location.href = "/confirmar.html";
  } catch (e) {
    showMessage(e.message, "error");
    if (registerSubmitBtn) {
      registerSubmitBtn.disabled = false;
      registerSubmitBtn.textContent = "Continuar y verificar correo";
    }
  }
});

if (window.EyeIcons) {
  const brand = document.getElementById("brandIcon");
  if (brand) brand.innerHTML = window.EyeIcons.eye();
}
checkAlreadyLoggedIn();
