const uploadBtn = document.getElementById("uploadBtn");
const newFolderBtn = document.getElementById("newFolderBtn");
const folderTreeBtn = document.getElementById("folderTreeBtn");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const searchInput = document.getElementById("searchInput");
const fileGrid = document.getElementById("fileGrid");
const fileCount = document.getElementById("fileCount");
const emptyState = document.getElementById("emptyState");
const refreshBtn = document.getElementById("refreshBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const dropzone = document.getElementById("dropzone");
const uploadProgress = document.getElementById("uploadProgress");
const uploadProgressTitle = document.getElementById("uploadProgressTitle");
const uploadProgressPercent = document.getElementById("uploadProgressPercent");
const uploadProgressText = document.getElementById("uploadProgressText");
const uploadProgressFill = document.getElementById("uploadProgressFill");
const uploadCancelBtn = document.getElementById("uploadCancelBtn");
const cardTemplate = document.getElementById("fileCardTemplate");
const breadcrumb = document.getElementById("breadcrumb");
const navDrive = document.getElementById("navDrive");
const sidebarFolderTree = document.getElementById("sidebarFolderTree");
const shareDialog = document.getElementById("shareDialog");
const shareUrlInput = document.getElementById("shareUrlInput");
const shareCopyBtn = document.getElementById("shareCopyBtn");
const shareEmailBtn = document.getElementById("shareEmailBtn");
const shareCloseBtn = document.getElementById("shareCloseBtn");
const appModal = document.getElementById("appModal");
const appModalTitle = document.getElementById("appModalTitle");
const appModalMessage = document.getElementById("appModalMessage");
const appModalInput = document.getElementById("appModalInput");
const appModalCancelBtn = document.getElementById("appModalCancelBtn");
const appModalOkBtn = document.getElementById("appModalOkBtn");
const pickFilesBtn = document.getElementById("pickFilesBtn");
const downloadCurrentFolderBtn = document.getElementById("downloadCurrentFolderBtn");
const shareCurrentFolderBtn = document.getElementById("shareCurrentFolderBtn");
const contextMenu = document.getElementById("contextMenu");
const mainContent = document.querySelector("main.content");
const sidebar = document.querySelector("aside.sidebar");
const sharePickBanner = document.getElementById("sharePickBanner");
const sharePickCancelBtn = document.getElementById("sharePickCancelBtn");
/** En Mi unidad: el usuario elige qué carpeta compartir */
let sharePickMode = false;
const THEME_KEY = "eyedrive.theme.v1";

/** @type {{ url: string, name: string }} */
let lastShare = { url: "", name: "" };
/** ids de carpetas expandidas en el árbol lateral */
const expandedFolderIds = new Set();

function showAppModal({ title, message, mode, defaultValue, okText, cancelText, placeholder }) {
  return new Promise((resolve) => {
    if (!appModal || !appModalTitle || !appModalMessage || !appModalOkBtn || !appModalCancelBtn || !appModalInput) {
      if (mode === "prompt") resolve({ ok: true, value: defaultValue || "" });
      else if (mode === "confirm") resolve({ ok: true });
      else resolve({ ok: true });
      return;
    }
    appModalTitle.textContent = title || "Eyedrive";
    appModalMessage.textContent = message || "";
    appModalOkBtn.textContent = okText || "Aceptar";
    appModalCancelBtn.textContent = cancelText || "Cancelar";
    appModalCancelBtn.hidden = mode === "alert";

    if (mode === "prompt") {
      appModalInput.hidden = false;
      appModalInput.value = defaultValue || "";
      appModalInput.placeholder = placeholder || "";
    } else {
      appModalInput.hidden = true;
      appModalInput.value = "";
      appModalInput.placeholder = "";
    }

    let done = false;
    const closeAndResolve = (result) => {
      if (done) return;
      done = true;
      cleanup();
      if (appModal.open) appModal.close();
      resolve(result);
    };
    const onOk = () => closeAndResolve(mode === "prompt" ? { ok: true, value: appModalInput.value } : { ok: true });
    const onCancel = () => closeAndResolve(mode === "prompt" ? { ok: false, value: null } : { ok: false });
    const onClose = () => onCancel();
    const onInputKey = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        onOk();
      }
    };
    const cleanup = () => {
      appModalOkBtn.removeEventListener("click", onOk);
      appModalCancelBtn.removeEventListener("click", onCancel);
      appModal.removeEventListener("cancel", onCancel);
      appModal.removeEventListener("close", onClose);
      appModalInput.removeEventListener("keydown", onInputKey);
    };

    appModalOkBtn.addEventListener("click", onOk);
    appModalCancelBtn.addEventListener("click", onCancel);
    appModal.addEventListener("cancel", onCancel);
    appModal.addEventListener("close", onClose);
    appModalInput.addEventListener("keydown", onInputKey);
    appModal.showModal();
    if (mode === "prompt") appModalInput.focus();
    else appModalOkBtn.focus();
  });
}

async function appAlert(message, title = "Eyedrive") {
  await showAppModal({ title, message, mode: "alert", okText: "Aceptar" });
}

async function appConfirm(message, title = "Confirmar") {
  const r = await showAppModal({ title, message, mode: "confirm", okText: "Aceptar", cancelText: "Cancelar" });
  return Boolean(r.ok);
}

async function appPrompt(message, options) {
  const r = await showAppModal({
    title: options?.title || "Eyedrive",
    message,
    mode: "prompt",
    defaultValue: options?.defaultValue || "",
    placeholder: options?.placeholder || "",
    okText: options?.okText || "Aceptar",
    cancelText: options?.cancelText || "Cancelar",
  });
  return r.ok ? String(r.value || "") : null;
}

function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
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

function initDecorIcons() {
  if (!window.EyeIcons) return;
  const I = window.EyeIcons;
  const fill = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = fn();
  };
  fill("brandIcon", () => I.eye());
  fill("icUpload", () => I.cloudUpload());
  fill("icNewFolder", () => I.folderPlus());
  fill("icSearch", () => I.search());
  fill("icRefresh", () => I.refresh());
  fill("icNavDrive", () => I.hardDrive());
  fill("icDropzone", () => I.cloudUpload());
  fill("icContentHead", () => I.hardDrive());
  fill("icPickFiles", () => I.cloudUpload());
  fill("icDownloadCurrent", () => I.download());
  fill("icShareCurrent", () => I.share());
  fill("icEmpty", () => I.folder());
  fill("icFolderTree", () => I.folder());
  fill("icDialogShare", () => I.share());
  fill("icCopy", () => I.copy());
  fill("icMail", () => I.mail());
  fill("icThemeToggle", () => I.moon());
}

const NAV_STATE_KEY = "eyedrive.nav.pathSegments.v1";

/**
 * @param {unknown} raw
 * @returns {{ id: string, name: string }[]}
 */
function normalizeSegments(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const seg of raw) {
    if (!seg || typeof seg !== "object") continue;
    const id = typeof seg.id === "string" ? seg.id.trim() : "";
    const name = typeof seg.name === "string" ? seg.name.trim() : "";
    if (!id || !name) continue;
    out.push({ id, name });
  }
  return out;
}

function readPersistedPathSegments() {
  try {
    const hs = normalizeSegments(history.state?.pathSegments);
    if (hs.length) return hs;
  } catch {}
  try {
    const txt = sessionStorage.getItem(NAV_STATE_KEY);
    if (!txt) return [];
    return normalizeSegments(JSON.parse(txt));
  } catch {
    return [];
  }
}

function writePersistedPathSegments({ push }) {
  const clean = normalizeSegments(pathSegments);
  const state = { ...(history.state || {}), pathSegments: clean };
  if (push) history.pushState(state, "", location.href);
  else history.replaceState(state, "", location.href);
  try {
    sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(clean));
  } catch {}
}

/** @type {{ id: string, name: string }[]} */
let pathSegments = readPersistedPathSegments();
/** @type {any[]} */
let allItems = [];
/** Ids de elementos seleccionados (string) */
const selectedItemIds = new Set();
/** Para Mayús+clic: rango de selección en la lista visible */
let lastSelectionAnchorIndex = -1;

function getVisibleItemList() {
  const term = searchInput.value.trim().toLowerCase();
  return term
    ? allItems.filter((item) => item.name.toLowerCase().includes(term))
    : allItems;
}

function clearSelectionStateOnly() {
  selectedItemIds.clear();
  lastSelectionAnchorIndex = -1;
}

function clearSelection() {
  clearSelectionStateOnly();
  applySearchFilter();
}

/**
 * @param {{ id: string, name: string }[]} nextPath
 * @param {{ push?: boolean, clearSearch?: boolean }} [opts]
 */
function navigateToPath(nextPath, opts) {
  const push = Boolean(opts?.push);
  pathSegments = normalizeSegments(nextPath);
  fileInput.value = "";
  clearSelectionStateOnly();
  if (opts?.clearSearch) searchInput.value = "";
  if (pathSegments.length > 0) exitSharePickMode();
  writePersistedPathSegments({ push });
  loadItems();
}

function pruneSelection() {
  const valid = new Set(allItems.map((x) => String(x.id)));
  for (const id of [...selectedItemIds]) {
    if (!valid.has(id)) selectedItemIds.delete(id);
  }
}

/**
 * @param {string|number} id
 */
function toggleItemIdSelection(id) {
  const s = String(id);
  if (selectedItemIds.has(s)) selectedItemIds.delete(s);
  else selectedItemIds.add(s);
  applySearchFilter();
}

/**
 * @param {any} item
 * @param {number} itemIndex
 */
function selectOnlyAndAnchor(item, itemIndex) {
  selectedItemIds.clear();
  selectedItemIds.add(String(item.id));
  lastSelectionAnchorIndex = itemIndex;
  applySearchFilter();
}

/**
 * @param {any} item
 * @param {number} itemIndex
 */
function addToSelectionWithAnchor(item, itemIndex) {
  selectedItemIds.add(String(item.id));
  lastSelectionAnchorIndex = itemIndex;
  applySearchFilter();
}

function selectAllVisible() {
  const list = getVisibleItemList();
  for (const it of list) {
    selectedItemIds.add(String(it.id));
  }
  if (list.length) lastSelectionAnchorIndex = 0;
  applySearchFilter();
}

function getSelectedItems() {
  return allItems.filter((x) => selectedItemIds.has(String(x.id)));
}

function getSelectedFileItems() {
  return allItems.filter(
    (x) => x.itemType === "file" && selectedItemIds.has(String(x.id))
  );
}

function getSelectedMovableItems() {
  return allItems.filter((x) => selectedItemIds.has(String(x.id)));
}

async function apiFolderTree() {
  const res = await fetch("/api/folders/tree");
  if (!res.ok) throw new Error("tree");
  return res.json();
}

function buildFolderPathMap(folders) {
  const byId = new Map();
  folders.forEach((f) => byId.set(String(f.id), { ...f, id: String(f.id), parentId: f.parentId == null ? null : String(f.parentId) }));
  const cache = new Map();
  const pathOf = (id) => {
    const key = String(id);
    if (cache.has(key)) return cache.get(key);
    const node = byId.get(key);
    if (!node) return "Mi unidad / ?";
    const p = node.parentId && byId.has(node.parentId) ? `${pathOf(node.parentId)} / ${node.name}` : `Mi unidad / ${node.name}`;
    cache.set(key, p);
    return p;
  };
  const pathMap = new Map();
  byId.forEach((_, id) => pathMap.set(id, pathOf(id)));
  return { byId, pathMap };
}

function buildFolderByIdMap(folders) {
  const byId = new Map();
  folders.forEach((f) => {
    byId.set(String(f.id), {
      id: String(f.id),
      name: String(f.name || ""),
      parentId: f.parentId == null ? null : String(f.parentId),
    });
  });
  return byId;
}

function folderPathSegmentsFromId(byId, targetId) {
  const tid = String(targetId || "");
  if (!tid || !byId.has(tid)) return [];
  const chain = [];
  let cur = byId.get(tid);
  const guard = new Set();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    chain.push({ id: cur.id, name: cur.name });
    if (!cur.parentId) break;
    cur = byId.get(cur.parentId) || null;
  }
  return chain.reverse();
}

function ensureExpandedPathFromCurrent() {
  pathSegments.forEach((seg) => expandedFolderIds.add(String(seg.id)));
}

function renderSidebarFolderTree(folders) {
  if (!sidebarFolderTree) return;
  const byParent = new Map();
  const byId = buildFolderByIdMap(folders);
  folders.forEach((f) => {
    const parentKey = f.parentId == null ? "ROOT" : String(f.parentId);
    const arr = byParent.get(parentKey) || [];
    arr.push({ id: String(f.id), name: String(f.name || ""), parentId: f.parentId == null ? null : String(f.parentId) });
    byParent.set(parentKey, arr);
  });
  for (const [k, arr] of byParent) {
    arr.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
    byParent.set(k, arr);
  }

  const activeId = pathSegments.length ? String(pathSegments[pathSegments.length - 1].id) : "";
  sidebarFolderTree.innerHTML = "";

  const renderChildren = (parentId, level, ancestorsHasNext) => {
    const key = parentId == null ? "ROOT" : String(parentId);
    const children = byParent.get(key) || [];
    children.forEach((node, idx) => {
      const isLast = idx === children.length - 1;
      const item = document.createElement("div");
      item.className = "tree-item";
      item.style.setProperty("--level", String(level));

      const row = document.createElement("div");
      row.className = "tree-row";

      const guides = document.createElement("span");
      guides.className = "tree-guides";
      for (let i = 0; i < level; i++) {
        const g = document.createElement("span");
        g.className = "tree-guide";
        if (ancestorsHasNext[i]) g.classList.add("tree-guide--line");
        guides.appendChild(g);
      }
      row.appendChild(guides);

      const elbow = document.createElement("span");
      elbow.className = `tree-elbow ${isLast ? "tree-elbow--last" : ""}`;
      row.appendChild(elbow);

      const hasChildren = (byParent.get(node.id) || []).length > 0;
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "tree-toggle";
      toggle.setAttribute("aria-label", hasChildren ? "Expandir o contraer" : "Sin subcarpetas");
      if (!hasChildren) toggle.disabled = true;
      toggle.textContent = hasChildren ? (expandedFolderIds.has(node.id) ? "▾" : "▸") : "•";
      toggle.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!hasChildren) return;
        if (expandedFolderIds.has(node.id)) expandedFolderIds.delete(node.id);
        else expandedFolderIds.add(node.id);
        renderSidebarFolderTree(folders);
      });
      row.appendChild(toggle);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tree-node-btn";
      if (activeId === node.id) btn.classList.add("active");
      btn.textContent = node.name;
      btn.title = `Abrir ${node.name}`;
      btn.addEventListener("click", () => {
        const nextSegments = folderPathSegmentsFromId(byId, node.id);
        navigateToPath(nextSegments, { push: true });
      });
      row.appendChild(btn);

      item.appendChild(row);
      sidebarFolderTree.appendChild(item);

      if (hasChildren && expandedFolderIds.has(node.id)) {
        renderChildren(node.id, level + 1, [...ancestorsHasNext, !isLast]);
      }
    });
  };

  renderChildren(null, 0, []);
}

async function refreshSidebarFolderTree() {
  if (!sidebarFolderTree) return;
  try {
    ensureExpandedPathFromCurrent();
    const folders = await apiFolderTree();
    renderSidebarFolderTree(Array.isArray(folders) ? folders : []);
  } catch (e) {
    console.error(e);
  }
}

async function askDestinationFolder(movingItems) {
  const tree = await apiFolderTree();
  const { pathMap } = buildFolderPathMap(tree);
  const blocked = new Set();
  movingItems.forEach((it) => {
    if (it.itemType === "folder") blocked.add(String(it.id));
  });

  const choices = [{ id: "ROOT", label: "0) Mi unidad (raíz)" }];
  const sorted = [...tree]
    .map((f) => ({ id: String(f.id), label: pathMap.get(String(f.id)) || `Mi unidad / ${f.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  sorted.forEach((c, idx) => {
    const blockedMark = blocked.has(c.id) ? " [no disponible]" : "";
    choices.push({ id: c.id, label: `${idx + 1}) ${c.label}${blockedMark}` });
  });

  const text = [
    "Elige carpeta destino:",
    ...choices.map((c) => c.label),
    "",
    "Escribe el número (0 = Mi unidad).",
  ].join("\n");
  const raw = await appPrompt(text, { title: "Mover elementos" });
  if (raw == null) return { cancelled: true };
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n >= choices.length) {
    await appAlert("Opción no válida.");
    return { cancelled: true };
  }
  const picked = choices[n];
  if (picked.id !== "ROOT" && blocked.has(picked.id)) {
    await appAlert("No puedes mover una carpeta dentro de sí misma.");
    return { cancelled: true };
  }
  return { cancelled: false, targetParentId: picked.id === "ROOT" ? null : picked.id };
}

async function moveItems(itemIds, targetParentId) {
  const res = await fetch("/api/items/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemIds, targetParentId }),
  });
  if (res.status === 409) {
    const d = await res.json().catch(() => ({}));
    await appAlert(d.error || "No se puede mover por conflicto.");
    return false;
  }
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    await appAlert(d.error || "No se pudo mover.");
    return false;
  }
  return true;
}

async function moveSelectedItems() {
  const items = getSelectedMovableItems();
  if (!items.length) {
    await appAlert("Selecciona al menos un elemento.");
    return;
  }
  try {
    const ask = await askDestinationFolder(items);
    if (ask.cancelled) return;
    const ok = await moveItems(items.map((x) => x.id), ask.targetParentId);
    if (!ok) return;
    clearSelectionStateOnly();
    await loadItems();
  } catch (e) {
    console.error(e);
    await appAlert("No se pudo mover.");
  }
}

async function moveSingleItem(item) {
  try {
    const ask = await askDestinationFolder([item]);
    if (ask.cancelled) return;
    const ok = await moveItems([item.id], ask.targetParentId);
    if (!ok) return;
    await loadItems();
  } catch (e) {
    console.error(e);
    await appAlert("No se pudo mover.");
  }
}

async function removeItemsByIds(ids) {
  if (!ids.length) return;
  const n = ids.length;
  const msg =
    n === 1
      ? "¿Eliminar? Si es una carpeta, se borrará todo su contenido."
      : `¿Eliminar ${n} elementos? Las carpetas borrarán todo su contenido.`;
  if (!(await appConfirm(msg, "Eliminar selección"))) return;
  let failed = 0;
  for (const id of ids) {
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) failed += 1;
    } catch {
      failed += 1;
    }
  }
  clearSelectionStateOnly();
  await loadItems();
  if (failed) await appAlert(`No se pudieron eliminar ${failed} elemento(s).`);
}

async function downloadSelectedFileItems() {
  const files = getSelectedFileItems();
  if (!files.length) {
    await appAlert("En la selección no hay archivos (solo carpetas o nada).");
    return;
  }
  files.forEach((f, i) => {
    setTimeout(() => {
      window.open(`${location.origin}/api/files/${f.id}/download`, "_blank", "noopener,noreferrer");
    }, i * 200);
  });
}

function currentParentId() {
  if (!pathSegments.length) return null;
  return pathSegments[pathSegments.length - 1].id;
}

function currentFolder() {
  if (!pathSegments.length) return null;
  return pathSegments[pathSegments.length - 1];
}

function newFolderActionLabel() {
  return pathSegments.length ? "Nueva subcarpeta" : "Nueva carpeta";
}

function exitSharePickMode() {
  if (!sharePickMode) {
    if (mainContent) mainContent.classList.remove("content--share-pick");
    if (sharePickBanner) sharePickBanner.hidden = true;
    return;
  }
  sharePickMode = false;
  if (mainContent) mainContent.classList.remove("content--share-pick");
  if (sharePickBanner) sharePickBanner.hidden = true;
  updateShareFolderButton();
}

/**
 * Sólo en la raíz: activa la elección de carpeta a compartir
 */
function enterSharePickMode() {
  if (pathSegments.length > 0) return;
  sharePickMode = true;
  if (mainContent) mainContent.classList.add("content--share-pick");
  if (sharePickBanner) sharePickBanner.hidden = false;
  updateShareFolderButton();
}

function updateShareFolderButton() {
  const labelEl = document.getElementById("shareCurrentFolderBtnText");
  const inside = pathSegments.length > 0;
  if (!shareCurrentFolderBtn) return;
  if (inside) {
    if (labelEl) labelEl.textContent = "Compartir esta carpeta";
    shareCurrentFolderBtn.title = "Generar enlace para la carpeta en la que estás";
    shareCurrentFolderBtn.setAttribute("aria-label", "Compartir esta carpeta");
    shareCurrentFolderBtn.setAttribute("aria-pressed", "false");
  } else if (sharePickMode) {
    if (labelEl) labelEl.textContent = "Cancelar";
    shareCurrentFolderBtn.title = "Salir del modo de elegir carpeta";
    shareCurrentFolderBtn.setAttribute("aria-label", "Cancelar modo compartir");
    shareCurrentFolderBtn.setAttribute("aria-pressed", "true");
  } else {
    if (labelEl) labelEl.textContent = "Compartir carpeta";
    shareCurrentFolderBtn.title = "Elegir una carpeta y generar un enlace de compartir";
    shareCurrentFolderBtn.setAttribute("aria-label", "Compartir carpeta");
    shareCurrentFolderBtn.setAttribute("aria-pressed", "false");
  }
}

function updateInFolderTools() {
  const inside = pathSegments.length > 0;
  const t = newFolderBtn?.querySelector(".btn-text");
  if (t) t.textContent = newFolderActionLabel();
  if (newFolderBtn) {
    newFolderBtn.setAttribute(
      "title",
      pathSegments.length
        ? "Crea una subcarpeta dentro de la carpeta abierta"
        : "Crea una carpeta en la raíz (Mi unidad)"
    );
  }
  if (downloadCurrentFolderBtn) downloadCurrentFolderBtn.hidden = !inside;
  updateShareFolderButton();
}

function itemsQuery() {
  const p = currentParentId();
  return p == null ? "" : `?parentId=${encodeURIComponent(p)}`;
}

async function apiList() {
  const res = await fetch(`/api/items${itemsQuery()}`);
  if (!res.ok) throw new Error("No se pudo cargar el listado");
  return res.json();
}

function renderBreadcrumb() {
  breadcrumb.innerHTML = "";

  const root = document.createElement("button");
  root.type = "button";
  root.className = "crumb";
  root.textContent = "Mi unidad";
  root.addEventListener("click", () => {
    navigateToPath([], { push: true });
  });
  breadcrumb.appendChild(root);

  pathSegments.forEach((seg, index) => {
    const sep = document.createElement("span");
    sep.className = "crumb-sep";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "›";
    breadcrumb.appendChild(sep);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "crumb";
    btn.textContent = seg.name;
    btn.addEventListener("click", () => {
      navigateToPath(pathSegments.slice(0, index + 1), { push: true });
    });
    breadcrumb.appendChild(btn);
  });
}

function applySearchFilter() {
  const filtered = getVisibleItemList();
  renderItems(filtered);
}

async function loadItems() {
  try {
    allItems = await apiList();
    pruneSelection();
    if (pathSegments.length > 0) exitSharePickMode();
    writePersistedPathSegments({ push: false });
    renderBreadcrumb();
    updateInFolderTools();
    applySearchFilter();
    fileCount.textContent = `${allItems.length} elemento${allItems.length === 1 ? "" : "s"}`;
    await refreshSidebarFolderTree();
  } catch (e) {
    console.error(e);
    await appAlert("No se pudo cargar. Comprueba la conexión e inténtalo de nuevo.");
  }
}

async function openShareFolder(item) {
  try {
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: item.id }),
    });
    if (!res.ok) {
      await appAlert("No se pudo crear el enlace.");
      return;
    }
    const data = await res.json();
    lastShare = {
      url: `${location.origin}${data.path}`,
      name: item.name,
    };
    shareUrlInput.value = lastShare.url;
    if (sharePickMode) exitSharePickMode();
    shareDialog.showModal();
  } catch (e) {
    console.error(e);
    await appAlert("No se pudo crear el enlace.");
  }
}

shareCloseBtn.addEventListener("click", () => shareDialog.close());

const shareCopyLabel = shareCopyBtn.querySelector(".btn-text");
shareCopyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareUrlInput.value);
    if (shareCopyLabel) {
      const t = shareCopyLabel.textContent;
      shareCopyLabel.textContent = "Copiado";
      setTimeout(() => {
        shareCopyLabel.textContent = t;
      }, 1800);
    }
  } catch {
    shareUrlInput.select();
  }
});

shareEmailBtn.addEventListener("click", () => {
  if (!lastShare.url) return;
  const sub = encodeURIComponent(`Carpeta compartida: ${lastShare.name}`);
  const body = encodeURIComponent(
    `Hola,\n\nPuedes ver el contenido en este enlace:\n\n${lastShare.url}\n`
  );
  window.location.href = `mailto:?subject=${sub}&body=${body}`;
});

function openFilePicker() {
  fileInput.click();
}

uploadBtn.addEventListener("click", openFilePicker);
if (pickFilesBtn) pickFilesBtn.addEventListener("click", openFilePicker);

if (shareCurrentFolderBtn) {
  shareCurrentFolderBtn.addEventListener("click", () => {
    if (pathSegments.length > 0) {
      const folder = currentFolder();
      if (folder) openShareFolder({ id: folder.id, name: folder.name });
      return;
    }
    if (sharePickMode) {
      exitSharePickMode();
    } else {
      enterSharePickMode();
    }
  });
}
if (downloadCurrentFolderBtn) {
  downloadCurrentFolderBtn.addEventListener("click", () => {
    const folder = currentFolder();
    if (!folder) return;
    downloadItem({ id: folder.id, name: folder.name, itemType: "folder" });
  });
}
if (sharePickCancelBtn) {
  sharePickCancelBtn.addEventListener("click", () => exitSharePickMode());
}
if (folderTreeBtn && folderInput) {
  folderTreeBtn.addEventListener("click", () => folderInput.click());
}

fileInput.addEventListener("change", (event) => {
  const list = Array.from(event.target.files || []);
  if (list.length) uploadFiles(list, null);
  fileInput.value = "";
});

if (folderInput) {
  folderInput.addEventListener("change", () => {
    const list = Array.from(folderInput.files || []);
    if (!list.length) return;
    const paths = list.map((f) => f.webkitRelativePath || f.name);
    uploadFiles(list, paths);
    folderInput.value = "";
  });
}

async function createNewFolder() {
  const where = currentPathLabel();
  const name = await appPrompt(
    pathSegments.length
      ? `Nombre de la subcarpeta (se crea en «${where}»):`
      : `Nombre de la carpeta (se crea en «${where}»):`,
    { title: "Nueva carpeta", placeholder: "Escribe un nombre" }
  );
  if (!name || !name.trim()) return;
  const body = { name: name.trim() };
  const pid = currentParentId();
  if (pid) body.parentId = pid;
  try {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 409) {
      await appAlert("Ya hay un archivo o carpeta con ese nombre en esta ubicación.");
      return;
    }
    if (!res.ok) throw new Error("create folder");
    await loadItems();
  } catch (e) {
    console.error(e);
    await appAlert("No se pudo crear la carpeta.");
  }
}

newFolderBtn.addEventListener("click", createNewFolder);

searchInput.addEventListener("input", () => applySearchFilter());

refreshBtn.addEventListener("click", () => loadItems());

navDrive.addEventListener("click", (e) => {
  e.preventDefault();
  navigateToPath([], { push: true });
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  const dt = event.dataTransfer;
  if (!dt) return;
  try {
    const collected = await collectFromDataTransfer(dt);
    if (collected.length > 0) {
      uploadFiles(
        collected.map((x) => x.file),
        collected.map((x) => x.path)
      );
      return;
    }
  } catch (e) {
    console.error(e);
  }
  const list = Array.from(dt.files || []);
  if (list.length) uploadFiles(list, null);
});

/** Archivos por petición HTTP (por debajo del límite del servidor y para evitar timeouts). */
const UPLOAD_BATCH_SIZE = 8000;
let activeUploadController = null;

function showUploadProgress(totalFiles) {
  if (!uploadProgress) return;
  if (uploadProgressTitle) {
    uploadProgressTitle.textContent =
      totalFiles === 1 ? "Subiendo 1 archivo…" : `Subiendo ${totalFiles} archivos…`;
  }
  if (uploadProgressPercent) uploadProgressPercent.textContent = "0%";
  if (uploadProgressText) uploadProgressText.textContent = "Preparando subida…";
  if (uploadProgressFill) uploadProgressFill.style.width = "0%";
  uploadProgress.hidden = false;
}

function updateUploadProgress(done, total, label) {
  const safeTotal = total > 0 ? total : 1;
  const pct = Math.max(0, Math.min(100, Math.round((done / safeTotal) * 100)));
  if (uploadProgressPercent) uploadProgressPercent.textContent = `${pct}%`;
  if (uploadProgressFill) uploadProgressFill.style.width = `${pct}%`;
  if (uploadProgressText && label) uploadProgressText.textContent = label;
}

function hideUploadProgress() {
  if (!uploadProgress) return;
  uploadProgress.hidden = true;
}

function resetDropzoneText() {
  if (!dropzone) return;
  const t = dropzone.querySelector(".dropzone-text");
  if (t) {
    t.innerHTML = `<strong>Suelta archivos aquí</strong><span>ZIP, RAR, JAR, EXE, MSI, ISO u carpetas (arrastre o «Subir carpeta»)</span>`;
  }
}

function uploadBatchXHR(form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    activeUploadController = { xhr, cancelled: false };
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
    };
    xhr.onerror = () => reject(new Error("upload network"));
    xhr.onabort = () => reject(new Error("upload cancelled"));
    xhr.send(form);
  });
}

if (uploadCancelBtn) {
  uploadCancelBtn.addEventListener("click", () => {
    if (!activeUploadController?.xhr) return;
    activeUploadController.cancelled = true;
    activeUploadController.xhr.abort();
  });
}

/**
 * @param {File[]} incoming
 * @param {string[] | null} relativePaths mismo índice que incoming, o null = archivos en la carpeta actual
 */
async function uploadFiles(incoming, relativePaths) {
  if (!incoming.length) return;
  const pid = currentParentId();
  const usePaths = Array.isArray(relativePaths) && relativePaths.length === incoming.length;
  const total = incoming.length;
  const totalBytes = incoming.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
  let completedBytes = 0;
  let uploaded = 0;
  showUploadProgress(total);
  updateUploadProgress(0, totalBytes, "Iniciando…");

  try {
    for (let start = 0; start < total; start += UPLOAD_BATCH_SIZE) {
      const end = Math.min(start + UPLOAD_BATCH_SIZE, total);
      if (activeUploadController?.cancelled) throw new Error("upload cancelled");
      const form = new FormData();
      if (pid) form.append("parentId", pid);
      let batchBytes = 0;
      for (let i = start; i < end; i++) {
        form.append("files", incoming[i]);
        batchBytes += Number(incoming[i].size) || 0;
        if (usePaths) {
          form.append("relativePaths", relativePaths[i] || "");
        }
      }
      const res = await uploadBatchXHR(form, (loaded, batchTotal) => {
        const bt = batchTotal > 0 ? batchTotal : batchBytes;
        updateUploadProgress(
          completedBytes + loaded,
          totalBytes,
          `Subiendo… ${Math.min(end, total)} de ${total} archivos`
        );
        if (bt <= 0) {
          updateUploadProgress(
            completedBytes + loaded,
            totalBytes,
            `Subiendo… ${Math.min(end, total)} de ${total} archivos`
          );
        }
      });
      if (res.status === 413) {
        await appAlert("Algún archivo supera el tamaño máximo o el servidor rechaza el lote (revisa MAX_FILES en Docker).");
        hideUploadProgress();
        resetDropzoneText();
        return;
      }
      if (res.status === 409) {
        await appAlert("Conflicto de nombre. Renombra o vacía un poco el destino e inténtalo de nuevo.");
        hideUploadProgress();
        resetDropzoneText();
        return;
      }
      if (!res.ok) throw new Error("upload");
      uploaded = end;
      completedBytes += batchBytes;
      updateUploadProgress(completedBytes, totalBytes, `Subiendo… ${uploaded} de ${total} archivos`);
    }
    updateUploadProgress(totalBytes || total, totalBytes || total, "Subida completada");
    setTimeout(hideUploadProgress, 700);
    resetDropzoneText();
    await loadItems();
  } catch (e) {
    console.error(e);
    resetDropzoneText();
    if (String(e.message || "").includes("cancelled") || activeUploadController?.cancelled) {
      hideUploadProgress();
      if (uploaded > 0) await appAlert(`Subida cancelada. Se subieron ${uploaded} de ${total} archivos.`);
      return;
    }
    hideUploadProgress();
    if (uploaded > 0 && uploaded < total) {
      await appAlert(`Se subieron ${uploaded} de ${total} archivos. El resto falló o canceló.`);
    } else {
      await appAlert("Error al subir archivos.");
    }
  } finally {
    activeUploadController = null;
  }
}

function readAllDirectoryEntries(dirReader) {
  return new Promise((resolve, reject) => {
    const acc = [];
    const read = () => {
      dirReader.readEntries((entries) => {
        if (entries.length === 0) {
          resolve(acc);
          return;
        }
        acc.push(...entries);
        read();
      }, reject);
    };
    read();
  });
}

/**
 * @param {FileSystemEntry} entry
 * @param {string} relBase prefijo con slash final vacío o "Carpeta/"
 * @returns {Promise<{ file: File, path: string }[]>}
 */
async function walkFileTree(entry, relBase) {
  if (entry.isFile) {
    return new Promise((resolve, reject) => {
      entry.file(
        (file) => {
          resolve([{ file, path: relBase + file.name }]);
        },
        reject
      );
    });
  }
  if (entry.isDirectory) {
    const prefix = relBase + entry.name + "/";
    const reader = entry.createReader();
    const children = await readAllDirectoryEntries(reader);
    if (children.length === 0) return [];
    const nested = await Promise.all(children.map((e) => walkFileTree(e, prefix)));
    return nested.flat();
  }
  return [];
}

/**
 * @param {DataTransfer} dataTransfer
 * @returns {Promise<{ file: File, path: string }[]>}
 */
async function collectFromDataTransfer(dataTransfer) {
  const items = dataTransfer.items;
  if (!items || items.length === 0) return [];
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const webItem = items[i];
    const entry = webItem.webkitGetAsEntry?.();
    if (entry) {
      const walked = await walkFileTree(entry, "");
      out.push(...walked);
      continue;
    }
    const f = webItem.getAsFile?.();
    if (f) {
      out.push({ file: f, path: f.name });
    }
  }
  return out;
}

function findItemById(id) {
  return allItems.find((x) => String(x.id) === String(id));
}

function currentPathLabel() {
  if (!pathSegments.length) return "Mi unidad";
  return ["Mi unidad", ...pathSegments.map((s) => s.name)].join(" / ");
}

/**
 * @param {any} item
 */
async function openItem(item) {
  if (sharePickMode) {
    if (item.itemType !== "folder") {
      await appAlert("Solo se pueden compartir carpetas. Toca una carpeta o pulsa Esc para salir.");
      return;
    }
    openShareFolder(item);
    return;
  }
  if (item.itemType === "folder") {
    navigateToPath([...pathSegments, { id: item.id, name: item.name }], { push: true });
  } else {
    clearSelection();
    window.location.assign(`/api/files/${item.id}/download`);
  }
}

/**
 * @param {any} item
 */
async function showItemInfo(item) {
  const isFolder = item.itemType === "folder";
  const line1 = isFolder
    ? `Carpeta: ${item.name}`
    : `Archivo: ${item.name} (${formatSize(item.size)})`;
  const lines = [line1, `Añadido: ${formatDate(item.addedAt)}`, `Id: ${item.id}`];
  await appAlert(lines.join("\n"), "Atajos");
}

function openFileDownloadNewTab(item) {
  if (item.itemType === "folder") {
    openItem(item);
    return;
  }
  const url = `${location.origin}/api/files/${item.id}/download`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function downloadUrlForFile(item) {
  return `${location.origin}/api/files/${item.id}/download`;
}

function downloadUrlForItem(item) {
  if (item.itemType === "folder") return `${location.origin}/api/items/${item.id}/download`;
  return downloadUrlForFile(item);
}

function downloadItem(item) {
  window.location.assign(downloadUrlForItem(item));
}

async function copyString(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
  }
}

function goToDriveRoot() {
  navigateToPath([], { push: true, clearSearch: true });
}

function openFolderTreePicker() {
  if (folderInput) folderInput.click();
}

function clearSearch() {
  searchInput.value = "";
  applySearchFilter();
}

let contextMenuCloseCleanup = null;

function hideContextMenu() {
  if (contextMenu) contextMenu.hidden = true;
  if (contextMenuCloseCleanup) {
    contextMenuCloseCleanup();
    contextMenuCloseCleanup = null;
  }
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ id?: string, separator?: boolean, label?: string, run?: () => void, danger?: boolean, disabled?: boolean }[]} entries
 */
function showContextMenu(clientX, clientY, entries) {
  if (!contextMenu) return;
  hideContextMenu();
  contextMenu.innerHTML = "";
  for (const e of entries) {
    if (e.separator) {
      const sep = document.createElement("div");
      sep.className = "context-menu-sep";
      sep.setAttribute("role", "separator");
      contextMenu.appendChild(sep);
      continue;
    }
    if (!e.run) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "context-menu-item" + (e.danger ? " context-menu-item--danger" : "");
    if (e.id) btn.id = e.id;
    btn.setAttribute("role", "menuitem");
    btn.textContent = e.label || "";
    const disabled = !!e.disabled;
    btn.disabled = disabled;
    btn.setAttribute("aria-disabled", disabled ? "true" : "false");
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (btn.disabled) return;
      const fn = e.run;
      hideContextMenu();
      fn();
    });
    contextMenu.appendChild(btn);
  }
  contextMenu.hidden = false;
  void contextMenu.offsetWidth;
  const pad = 8;
  const rect = contextMenu.getBoundingClientRect();
  let left = clientX;
  let top = clientY;
  if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
  if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
  if (left < pad) left = pad;
  if (top < pad) top = pad;
  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;

  const onDocMouseDown = (ev) => {
    if (ev.button !== 0) return;
    if (contextMenu && contextMenu.contains(ev.target)) return;
    hideContextMenu();
  };
  const onKey = (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      hideContextMenu();
    }
  };
  const onScrollOrResize = () => hideContextMenu();
  setTimeout(() => {
    document.addEventListener("mousedown", onDocMouseDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
  }, 0);
  contextMenuCloseCleanup = () => {
    document.removeEventListener("mousedown", onDocMouseDown, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("scroll", onScrollOrResize, true);
    window.removeEventListener("resize", onScrollOrResize);
  };
}

if (contextMenu) {
  contextMenu.addEventListener("contextmenu", (ev) => ev.preventDefault());
  contextMenu.addEventListener("mousedown", (ev) => ev.stopPropagation());
}

function buildBackgroundMenu() {
  const hasSearch = searchInput.value.trim().length > 0;
  const inside = pathSegments.length > 0;
  const visible = getVisibleItemList();
  const nSel = selectedItemIds.size;
  const nFilesSelected = getSelectedFileItems().length;
  const items = [
    { label: "Elegir archivos", run: openFilePicker },
    { label: "Subir carpeta", run: openFolderTreePicker },
    { label: newFolderActionLabel(), run: createNewFolder },
    { separator: true },
  ];
  if (visible.length) {
    items.push({ label: "Seleccionar todos (esta vista)", run: selectAllVisible });
  }
  if (nSel) {
    items.push(
      { label: "Quitar selección", run: clearSelection },
      {
        label: nSel > 1 ? `Mover ${nSel} seleccionados` : "Mover seleccionado",
        run: moveSelectedItems,
      },
      {
        label: `Descargar archivos de la selección${nFilesSelected ? ` (${nFilesSelected})` : ""}`,
        run: downloadSelectedFileItems,
        disabled: nFilesSelected === 0,
      },
      {
        label: nSel > 1 ? `Eliminar ${nSel} seleccionados` : "Eliminar seleccionado",
        run: () => removeItemsByIds([...selectedItemIds]),
        danger: true,
        disabled: false,
      }
    );
  }
  items.push(
    { separator: true },
    { label: "Actualizar", run: () => loadItems() }
  );
  if (hasSearch) {
    items.push({ label: "Limpiar búsqueda", run: clearSearch });
  }
  if (inside) {
    items.push(
      { separator: true },
      { label: "Volver a Mi unidad", run: goToDriveRoot },
      {
        label: "Compartir esta carpeta",
        run: () => {
          const folder = currentFolder();
          if (folder) openShareFolder({ id: folder.id, name: folder.name });
        },
      },
      { label: "Copiar ruta", run: () => copyString(currentPathLabel()) }
    );
  } else {
    items.push(
      { separator: true },
      sharePickMode
        ? { label: "Cancelar modo compartir", run: exitSharePickMode }
        : { label: "Compartir una carpeta…", run: enterSharePickMode },
      { label: "Copiar ruta (Mi unidad)", run: () => copyString(currentPathLabel()) }
    );
  }
  return items;
}

function buildBreadcrumbMenu() {
  const items = [{ label: "Copiar ruta", run: () => copyString(currentPathLabel()) }];
  if (pathSegments.length > 0) {
    items.push({ separator: true }, { label: "Ir a Mi unidad", run: goToDriveRoot });
  }
  return items;
}

/**
 * @param {any} item
 */
function buildItemMenu(item) {
  const isFolder = item.itemType === "folder";
  const idStr = String(item.id);
  const inSel = selectedItemIds.has(idStr);
  const nSel = selectedItemIds.size;
  const list = getVisibleItemList();
  const idx = list.findIndex((x) => String(x.id) === idStr);
  const nFilesInSel = getSelectedFileItems().length;

  /** @type {{ id?: string, separator?: boolean, label?: string, run?: () => void, danger?: boolean, disabled?: boolean }[]} */
  const out = [
    { label: "Seleccionar solo este", run: () => selectOnlyAndAnchor(item, Math.max(0, idx)) },
    {
      label: inSel ? "Quitar de la selección" : "Añadir a la selección",
      run: () => toggleItemIdSelection(item.id),
    },
  ];
  if (list.length) {
    out.push({ label: "Seleccionar todos (esta vista)", run: selectAllVisible });
  }
  if (nSel) {
    out.push({ label: "Quitar toda la selección", run: clearSelection });
  }
  out.push({ separator: true });

  if (nSel >= 2 && inSel) {
    out.push(
      {
        label: `Mover ${nSel} seleccionados`,
        run: moveSelectedItems,
      },
      {
        label: `Descargar archivos de la selección${nFilesInSel ? ` (${nFilesInSel})` : ""}`,
        run: downloadSelectedFileItems,
        disabled: nFilesInSel === 0,
      },
      {
        label: `Eliminar ${nSel} seleccionados`,
        run: () => removeItemsByIds([...selectedItemIds]),
        danger: true,
      },
      { separator: true }
    );
  }

  const endSingleDelete = {
    label: nSel > 1 ? "Eliminar solo este" : "Eliminar",
    run: () => removeItem(item.id),
    danger: true,
  };

  if (isFolder) {
    out.push(
      { label: "Abrir", run: () => openItem(item) },
      { label: "Descargar", run: () => downloadItem(item) },
      { label: "Mover…", run: () => moveSingleItem(item) },
      { label: "Compartir", run: () => openShareFolder(item) },
      { label: "Copiar nombre", run: () => copyString(item.name) },
      { separator: true },
      { label: "Información", run: () => showItemInfo(item) },
      endSingleDelete
    );
  } else {
    out.push(
      { label: "Abrir o descargar", run: () => openItem(item) },
      { label: "Descargar", run: () => downloadItem(item) },
      { label: "Mover…", run: () => moveSingleItem(item) },
      { label: "Abrir en otra pestaña", run: () => openFileDownloadNewTab(item) },
      { label: "Copiar enlace de descarga", run: () => copyString(downloadUrlForFile(item)) },
      { label: "Copiar nombre", run: () => copyString(item.name) },
      { separator: true },
      { label: "Información", run: () => showItemInfo(item) },
      endSingleDelete
    );
  }
  return out;
}

document.addEventListener("contextmenu", (ev) => {
  if (contextMenu && !contextMenu.hidden && contextMenu.contains(ev.target)) {
    return;
  }
  const t = ev.target;
  if (t == null) return;
  if (t.closest("dialog[open]")) return;
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
  if (t.closest("input, textarea, [contenteditable='true']")) return;

  const card = t.closest?.(".file-card");
  if (card && fileGrid?.contains(card)) {
    const id = card.getAttribute("data-item-id");
    const item = id != null ? findItemById(id) : null;
    ev.preventDefault();
    if (item) showContextMenu(ev.clientX, ev.clientY, buildItemMenu(item));
    else showContextMenu(ev.clientX, ev.clientY, buildBackgroundMenu());
    return;
  }

  if (t.closest?.(".breadcrumb")) {
    ev.preventDefault();
    showContextMenu(ev.clientX, ev.clientY, buildBreadcrumbMenu());
    return;
  }

  if (t.closest?.("#contextMenu")) return;

  if (sidebar && sidebar.contains(t) && !t.closest("input, textarea")) {
    ev.preventDefault();
    showContextMenu(ev.clientX, ev.clientY, buildBackgroundMenu());
    return;
  }

  if (mainContent && mainContent.contains(t)) {
    if (t.closest("input, textarea, select")) return;
    ev.preventDefault();
    showContextMenu(ev.clientX, ev.clientY, buildBackgroundMenu());
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.querySelector("dialog[open]")) return;
  if (contextMenu && !contextMenu.hidden) return;
  if (sharePickMode) {
    e.preventDefault();
    exitSharePickMode();
    return;
  }
  if (selectedItemIds.size > 0) {
    e.preventDefault();
    clearSelection();
  }
});

window.addEventListener("popstate", (ev) => {
  const next = normalizeSegments(ev.state?.pathSegments);
  pathSegments = next;
  fileInput.value = "";
  clearSelectionStateOnly();
  if (next.length > 0) exitSharePickMode();
  loadItems();
});

let lastAutoRefreshAt = 0;
function autoRefreshIfStale() {
  const now = Date.now();
  if (now - lastAutoRefreshAt < 4000) return;
  lastAutoRefreshAt = now;
  loadItems();
}

window.addEventListener("focus", () => autoRefreshIfStale());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") autoRefreshIfStale();
});

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

async function removeItem(id) {
  if (!(await appConfirm("¿Eliminar? Si es una carpeta, se borrará todo su contenido.", "Eliminar"))) return;
  try {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.status === 404) {
      await appAlert("No encontrado.");
      return;
    }
    if (!res.ok) throw new Error("delete");
    await loadItems();
  } catch (e) {
    console.error(e);
    await appAlert("Error al eliminar.");
  }
}

function renderItems(list) {
  fileGrid.innerHTML = "";

  for (const item of list) {
    const isFolder = item.itemType === "folder";
    const node = cardTemplate.content.firstElementChild.cloneNode(true);
    const icon = node.querySelector(".file-icon");
    const fileInfo = node.querySelector(".file-info");

    node.querySelector(".file-name").textContent = item.name;
    fileInfo.textContent = isFolder
      ? `Carpeta · ${formatDate(item.addedAt)}`
      : `${formatSize(item.size)} · ${formatDate(item.addedAt)}`;

    if (isFolder) {
      node.classList.add("folder");
    }
    if (window.EyeIcons) {
      window.EyeIcons.setFileIcon(icon, isFolder ? "folder" : "file", item.name || "");
    }

    const delBtn = node.querySelector(".delete-btn");
    const delIc = delBtn.querySelector(".icon-btn-ic");
    if (delIc && window.EyeIcons) delIc.innerHTML = window.EyeIcons.trash();

    const idKey = String(item.id);
    node.dataset.itemId = idKey;
    if (selectedItemIds.has(idKey)) {
      node.classList.add("file-card--selected");
      node.setAttribute("aria-selected", "true");
    } else {
      node.setAttribute("aria-selected", "false");
    }

    node.addEventListener("click", (ev) => {
      if (ev.target.closest(".icon-btn") || ev.target.closest(".delete-btn")) return;
      const list = getVisibleItemList();
      const myIdx = list.findIndex((x) => String(x.id) === idKey);
      if (ev.shiftKey && lastSelectionAnchorIndex >= 0 && myIdx >= 0) {
        ev.preventDefault();
        const a = Math.min(myIdx, lastSelectionAnchorIndex);
        const b = Math.max(myIdx, lastSelectionAnchorIndex);
        for (let j = a; j <= b; j++) {
          selectedItemIds.add(String(list[j].id));
        }
        applySearchFilter();
        return;
      }
      if (ev.ctrlKey || ev.metaKey) {
        ev.preventDefault();
        toggleItemIdSelection(item.id);
        if (myIdx >= 0) lastSelectionAnchorIndex = myIdx;
        return;
      }
      lastSelectionAnchorIndex = myIdx >= 0 ? myIdx : 0;
      openItem(item);
    });
    node.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (ev.ctrlKey || ev.metaKey) {
          toggleItemIdSelection(item.id);
          return;
        }
        openItem(item);
      }
    });

    delBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      removeItem(item.id);
    });
    fileGrid.appendChild(node);

  }

  const hasCards = fileGrid.children.length > 0;
  emptyState.hidden = hasCards;
  emptyState.style.display = hasCards ? "none" : "flex";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
}

initTheme();
initDecorIcons();
loadItems();
