const authMessage = document.getElementById("authMessage");
const resetRequestForm = document.getElementById("resetRequestForm");
const resetRequestBtn = document.getElementById("resetRequestBtn");

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

resetRequestForm?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  hideMessage();

  const email = document.getElementById("resetEmail").value.trim();
  if (resetRequestBtn) {
    resetRequestBtn.disabled = true;
    resetRequestBtn.textContent = "Enviando…";
  }

  try {
    const res = await fetch(
      "/api/auth/password/request",
      window.EyeAuth.fetchJsonOpts({
        method: "POST",
        body: JSON.stringify({ email }),
      })
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo enviar el código");

    sessionStorage.setItem("eyedrive.resetEmail", email);
    window.location.href = "/recuperar-confirmar.html";
  } catch (e) {
    showMessage(e.message, "error");
    if (resetRequestBtn) {
      resetRequestBtn.disabled = false;
      resetRequestBtn.textContent = "Enviar código";
    }
  }
});

if (window.EyeIcons) {
  const brand = document.getElementById("brandIcon");
  if (brand) brand.innerHTML = window.EyeIcons.eye();
}
checkAlreadyLoggedIn();
