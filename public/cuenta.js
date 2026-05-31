const THEME_KEY = "eyedrive.theme.v1";

function showMessage(text, type = "info") {
  const el = document.getElementById("accountMessage");
  if (!el) return;
  el.hidden = false;
  el.textContent = text;
  el.className = `auth-message auth-message--${type}`;
}

function hideMessage() {
  const el = document.getElementById("accountMessage");
  if (el) el.hidden = true;
}

function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) {
    const title = t === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
    themeToggleBtn.title = title;
    themeToggleBtn.setAttribute("aria-label", title);
    const ic = document.getElementById("icThemeToggle");
    if (ic && window.EyeIcons) ic.innerHTML = t === "dark" ? window.EyeIcons.sun() : window.EyeIcons.moon();
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

function userInitials(name, email) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function renderUserMenu(user) {
  const stats = document.getElementById("accountTopbarStats");
  if (!stats || !user) return;

  let menu = document.getElementById("userMenu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "userMenu";
    menu.className = "user-menu";
    menu.innerHTML = `
      <button type="button" class="user-menu-btn" id="userMenuBtn" aria-haspopup="true" aria-expanded="false">
        <span class="user-avatar" id="userAvatar"></span>
        <span id="userMenuLabel"></span>
      </button>
      <div class="user-menu-dropdown" id="userMenuDropdown" hidden>
        <div class="user-menu-email" id="userMenuEmail"></div>
        <a href="/cuenta.html" aria-current="page">Mi cuenta</a>
        <a href="/">Mi unidad</a>
        <button type="button" id="userLogoutBtn">Cerrar sesión</button>
      </div>`;
    stats.insertBefore(menu, stats.firstChild);

    document.getElementById("userMenuBtn")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const dd = document.getElementById("userMenuDropdown");
      const open = dd?.hidden;
      if (dd) dd.hidden = !open;
      document.getElementById("userMenuBtn")?.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.getElementById("userLogoutBtn")?.addEventListener("click", async () => {
      await fetch("/api/auth/logout", window.EyeAuth.fetchJsonOpts({ method: "POST" }));
      window.EyeAuth.clearSessionToken();
      window.location.replace("/login.html");
    });

    document.addEventListener("click", () => {
      const dd = document.getElementById("userMenuDropdown");
      if (dd) dd.hidden = true;
      document.getElementById("userMenuBtn")?.setAttribute("aria-expanded", "false");
    });
  }

  const label = user.displayName || user.email.split("@")[0];
  const avatar = document.getElementById("userAvatar");
  const menuLabel = document.getElementById("userMenuLabel");
  const menuEmail = document.getElementById("userMenuEmail");
  if (avatar) avatar.textContent = userInitials(user.displayName, user.email);
  if (menuLabel) menuLabel.textContent = label;
  if (menuEmail) menuEmail.textContent = user.email;
}

async function loadAccount() {
  const res = await fetch("/api/auth/me", window.EyeAuth.fetchOpts());
  if (!res.ok) {
    window.location.replace("/login.html");
    return null;
  }
  return res.json();
}

async function init() {
  initTheme();

  if (window.EyeIcons) {
    const brand = document.getElementById("brandIcon");
    const driveIc = document.getElementById("icNavDrive");
    const themeIc = document.getElementById("icThemeToggle");
    if (brand) brand.innerHTML = window.EyeIcons.eye();
    if (driveIc) driveIc.innerHTML = window.EyeIcons.hardDrive();
    const t = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    if (themeIc) themeIc.innerHTML = t === "dark" ? window.EyeIcons.sun() : window.EyeIcons.moon();
  }

  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  const user = await loadAccount();
  if (!user) return;

  renderUserMenu(user);

  document.getElementById("displayName").value = user.displayName || "";
  document.getElementById("accountEmail").textContent = user.email;
  document.getElementById("accountVerified").textContent = user.emailVerified ? "Verificado" : "Pendiente";

  await initTwoFactor();

  document.getElementById("profileForm")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const displayName = document.getElementById("displayName").value.trim();
    try {
      const res = await fetch(
        "/api/auth/account",
        window.EyeAuth.fetchJsonOpts({
          method: "PATCH",
          body: JSON.stringify({ displayName }),
        })
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      user.displayName = displayName;
      renderUserMenu(user);
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
      const res = await fetch(
        "/api/auth/account/password",
        window.EyeAuth.fetchJsonOpts({
          method: "PATCH",
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error");
      document.getElementById("passwordForm").reset();
      showMessage("Contraseña actualizada.", "success");
    } catch (e) {
      showMessage(e.message, "error");
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await fetch("/api/auth/logout", window.EyeAuth.fetchJsonOpts({ method: "POST" }));
    window.EyeAuth.clearSessionToken();
    window.location.replace("/login.html");
  });

  document.getElementById("logoutAllBtn")?.addEventListener("click", async () => {
    await fetch("/api/auth/sessions", window.EyeAuth.fetchJsonOpts({ method: "DELETE" }));
    window.EyeAuth.clearSessionToken();
    window.location.replace("/login.html");
  });
}

function renderBackupCodes(codes) {
  const list = document.getElementById("twoFactorBackupList");
  const panel = document.getElementById("twoFactorBackupPanel");
  if (!list || !panel) return;
  list.innerHTML = "";
  for (const code of codes || []) {
    const li = document.createElement("li");
    li.textContent = code;
    list.appendChild(li);
  }
  panel.hidden = !codes?.length;
}

function renderTwoFactorUi(state) {
  const status = document.getElementById("twoFactorStatus");
  const backupCount = document.getElementById("twoFactorBackupCount");
  const disabledPanel = document.getElementById("twoFactorDisabledPanel");
  const enabledPanel = document.getElementById("twoFactorEnabledPanel");
  const setupPanel = document.getElementById("twoFactorSetupPanel");

  if (status) status.textContent = state.enabled ? "Activada" : "Desactivada";
  if (backupCount) backupCount.textContent = String(state.backupCodesRemaining ?? 0);
  if (disabledPanel) disabledPanel.hidden = Boolean(state.enabled);
  if (enabledPanel) enabledPanel.hidden = !state.enabled;
  if (setupPanel && state.enabled) setupPanel.hidden = true;
  if (document.getElementById("accountPhone")) {
    document.getElementById("accountPhone").value = state.phone || "";
  }
}

async function loadTwoFactorState() {
  const res = await fetch("/api/auth/2fa", window.EyeAuth.fetchOpts());
  if (!res.ok) throw new Error("No se pudo cargar 2FA");
  return res.json();
}

async function initTwoFactor() {
  try {
    const state = await loadTwoFactorState();
    renderTwoFactorUi(state);
  } catch (e) {
    showMessage(e.message, "error");
  }

  document.getElementById("phoneForm")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const phone = document.getElementById("accountPhone").value.trim();
    try {
      const res = await fetch(
        "/api/auth/2fa/phone",
        window.EyeAuth.fetchJsonOpts({
          method: "PATCH",
          body: JSON.stringify({ phone }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error");
      showMessage("Teléfono guardado.", "success");
    } catch (e) {
      showMessage(e.message, "error");
    }
  });

  document.getElementById("twoFactorSetupBtn")?.addEventListener("click", async () => {
    hideMessage();
    try {
      const res = await fetch("/api/auth/2fa/setup", window.EyeAuth.fetchJsonOpts({ method: "POST" }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error");
      document.getElementById("twoFactorDisabledPanel").hidden = true;
      const setupPanel = document.getElementById("twoFactorSetupPanel");
      if (setupPanel) setupPanel.hidden = false;
      const qr = document.getElementById("twoFactorQr");
      const secret = document.getElementById("twoFactorSecret");
      if (qr) qr.src = data.qrDataUrl;
      if (secret) secret.textContent = data.secret;
    } catch (e) {
      showMessage(e.message, "error");
    }
  });

  document.getElementById("twoFactorSetupCancelBtn")?.addEventListener("click", async () => {
    document.getElementById("twoFactorSetupPanel").hidden = true;
    document.getElementById("twoFactorDisabledPanel").hidden = false;
    renderBackupCodes([]);
  });

  document.getElementById("twoFactorEnableForm")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const code = document.getElementById("twoFactorEnableCode").value.trim();
    const password = document.getElementById("twoFactorEnablePassword").value;
    try {
      const res = await fetch(
        "/api/auth/2fa/enable",
        window.EyeAuth.fetchJsonOpts({
          method: "POST",
          body: JSON.stringify({ code, password }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error");
      document.getElementById("twoFactorSetupPanel").hidden = true;
      renderBackupCodes(data.backupCodes);
      const state = await loadTwoFactorState();
      renderTwoFactorUi(state);
      showMessage("Verificación en 2 pasos activada. Guarda los códigos de respaldo.", "success");
      document.getElementById("twoFactorEnableForm").reset();
    } catch (e) {
      showMessage(e.message, "error");
    }
  });

  document.getElementById("twoFactorDisableForm")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const code = document.getElementById("twoFactorDisableCode").value.trim();
    const password = document.getElementById("twoFactorDisablePassword").value;
    try {
      const res = await fetch(
        "/api/auth/2fa/disable",
        window.EyeAuth.fetchJsonOpts({
          method: "POST",
          body: JSON.stringify({ code, password }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error");
      renderBackupCodes([]);
      const state = await loadTwoFactorState();
      renderTwoFactorUi(state);
      document.getElementById("twoFactorDisableForm").reset();
      showMessage("Verificación en 2 pasos desactivada.", "success");
    } catch (e) {
      showMessage(e.message, "error");
    }
  });

  document.getElementById("twoFactorRegenForm")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const code = document.getElementById("twoFactorRegenCode").value.trim();
    const password = document.getElementById("twoFactorRegenPassword").value;
    try {
      const res = await fetch(
        "/api/auth/2fa/backup/regenerate",
        window.EyeAuth.fetchJsonOpts({
          method: "POST",
          body: JSON.stringify({ code, password }),
        })
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error");
      renderBackupCodes(data.backupCodes);
      const state = await loadTwoFactorState();
      renderTwoFactorUi(state);
      document.getElementById("twoFactorRegenForm").reset();
      showMessage("Códigos de respaldo regenerados.", "success");
    } catch (e) {
      showMessage(e.message, "error");
    }
  });
}

init();
