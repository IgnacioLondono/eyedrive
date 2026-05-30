const fetchOpts = { credentials: "include", headers: { "Content-Type": "application/json" } };

function showMessage(text, type = "info") {
  const el = document.getElementById("accountMessage");
  if (!el) return;
  el.hidden = false;
  el.textContent = text;
  el.className = `auth-message auth-message--${type}`;
}

async function loadAccount() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) {
    window.location.href = "/login.html";
    return null;
  }
  return res.json();
}

async function init() {
  const user = await loadAccount();
  if (!user) return;

  document.getElementById("displayName").value = user.displayName || "";
  document.getElementById("accountEmail").textContent = user.email;
  document.getElementById("accountVerified").textContent = user.emailVerified ? "Verificado" : "Pendiente";

  document.getElementById("profileForm")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const displayName = document.getElementById("displayName").value.trim();
    try {
      const res = await fetch("/api/auth/account", {
        ...fetchOpts,
        method: "PATCH",
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      showMessage("Perfil actualizado.", "success");
    } catch (e) {
      showMessage(e.message, "error");
    }
  });

  document.getElementById("passwordForm")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmNewPassword").value;
    if (newPassword !== confirmPassword) {
      showMessage("Las contraseñas nuevas no coinciden.", "error");
      return;
    }
    try {
      const res = await fetch("/api/auth/account/password", {
        ...fetchOpts,
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error");
      document.getElementById("passwordForm").reset();
      showMessage("Contraseña actualizada.", "success");
    } catch (e) {
      showMessage(e.message, "error");
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { ...fetchOpts, method: "POST" });
    window.location.href = "/login.html";
  });

  document.getElementById("logoutAllBtn")?.addEventListener("click", async () => {
    await fetch("/api/auth/sessions", { ...fetchOpts, method: "DELETE" });
    window.location.href = "/login.html";
  });
}

if (typeof initDecorIcons === "function") {
  initDecorIcons();
} else if (window.EyeIcons) {
  const navIc = document.getElementById("icNavAccount");
  const brand = document.getElementById("brandIcon");
  const driveIc = document.getElementById("icNavDrive");
  if (brand) brand.innerHTML = window.EyeIcons.eye();
  if (driveIc) driveIc.innerHTML = window.EyeIcons.hardDrive();
  if (navIc) navIc.innerHTML = window.EyeIcons.user();
}
init();
