const token = (typeof window !== "undefined" && window.__SHARE_TOKEN__) || "";
const shareBreadcrumb = document.getElementById("shareBreadcrumb");
const shareGrid = document.getElementById("shareGrid");
const shareEmpty = document.getElementById("shareEmpty");
const shareError = document.getElementById("shareError");
const cardTemplate = document.getElementById("shareCardTemplate");
const shareSelectionInfo = document.getElementById("shareSelectionInfo");
const shareSelectAllBtn = document.getElementById("shareSelectAllBtn");
const shareClearSelectionBtn = document.getElementById("shareClearSelectionBtn");
const shareDownloadSelectedBtn = document.getElementById("shareDownloadSelectedBtn");
const shareSearchInput = document.getElementById("shareSearchInput");
const shareDownloadCurrentBtn = document.getElementById("shareDownloadCurrentBtn");

const TOKEN_RE = /^[0-9a-f]{64}$/i;
const SHARE_NAV_KEY = `eyedrive.share.path.v1:${token}`;
/** @type {string} */
let rootId = "";
/** @type {string} */
let shareFolderName = "";
/** @type {{ id: string, name: string }[]} */
let pathWithin = [];
/** @type {any[]} */
let listCache = [];
const selectedIds = new Set();
let selectionAnchorIndex = -1;

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

function currentParentId() {
  if (!pathWithin.length) return rootId;
  return pathWithin[pathWithin.length - 1].id;
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

function getFilteredList() {
  const q = shareSearchInput?.value.trim().toLowerCase() || "";
  if (!q) return listCache;
  return listCache.filter((x) => String(x.name || "").toLowerCase().includes(q));
}

function writeSharePathState({ push }) {
  const clean = normalizeSegments(pathWithin);
  const state = { ...(history.state || {}), sharePathWithin: clean };
  if (push) history.pushState(state, "", location.href);
  else history.replaceState(state, "", location.href);
  try {
    sessionStorage.setItem(SHARE_NAV_KEY, JSON.stringify(clean));
  } catch {}
}

function readSharePathState() {
  try {
    const hs = normalizeSegments(history.state?.sharePathWithin);
    if (hs.length) return hs;
  } catch {}
  try {
    const txt = sessionStorage.getItem(SHARE_NAV_KEY);
    if (!txt) return [];
    return normalizeSegments(JSON.parse(txt));
  } catch {
    return [];
  }
}

function renderBreadcrumb() {
  shareBreadcrumb.innerHTML = "";
  const root = document.createElement("button");
  root.type = "button";
  root.className = "crumb";
  root.textContent = shareFolderName;
  root.addEventListener("click", () => navigateSharePath([], { push: true }));
  shareBreadcrumb.appendChild(root);

  pathWithin.forEach((seg, index) => {
    const sep = document.createElement("span");
    sep.className = "crumb-sep";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "›";
    shareBreadcrumb.appendChild(sep);

    const b = document.createElement("button");
    b.type = "button";
    b.className = "crumb";
    b.textContent = seg.name;
    b.addEventListener("click", () => navigateSharePath(pathWithin.slice(0, index + 1), { push: true }));
    shareBreadcrumb.appendChild(b);
  });
}

function clearSelectionState() {
  selectedIds.clear();
  selectionAnchorIndex = -1;
}

function updateSelectionUi() {
  if (shareSelectionInfo) {
    const n = selectedIds.size;
    shareSelectionInfo.textContent = `${n} seleccionado${n === 1 ? "" : "s"}`;
  }
  if (shareClearSelectionBtn) shareClearSelectionBtn.disabled = selectedIds.size === 0;
  if (shareDownloadSelectedBtn) shareDownloadSelectedBtn.disabled = selectedIds.size === 0;
}

function currentSelectionItems() {
  return getFilteredList().filter((x) => selectedIds.has(String(x.id)));
}

function downloadUrlForSharedItem(item) {
  return `/api/share/${encodeURIComponent(token)}/item/${encodeURIComponent(item.id)}/download`;
}

function downloadSelection() {
  const items = currentSelectionItems();
  if (!items.length) return;
  items.forEach((item, idx) => {
    setTimeout(() => {
      window.open(downloadUrlForSharedItem(item), "_blank", "noopener,noreferrer");
    }, idx * 180);
  });
}

function downloadCurrentFolder() {
  const current = pathWithin.length ? pathWithin[pathWithin.length - 1] : { id: rootId, name: shareFolderName };
  if (!current?.id) return;
  window.location.assign(downloadUrlForSharedItem(current));
}

function navigateSharePath(nextPath, opts) {
  pathWithin = normalizeSegments(nextPath);
  clearSelectionState();
  if (opts?.clearSearch && shareSearchInput) shareSearchInput.value = "";
  writeSharePathState({ push: Boolean(opts?.push) });
  loadList();
}

function updateCardsSelectionClass(visible) {
  shareGrid
    .querySelectorAll(".file-card")
    .forEach((card, i) => card.classList.toggle("file-card--selected", selectedIds.has(String(visible[i].id))));
}

async function loadList() {
  shareError.hidden = true;
  const parent = currentParentId();
  const u = new URLSearchParams();
  u.set("parentId", parent);
  const res = await fetch(`/api/share/${encodeURIComponent(token)}/items?${u}`);
  if (res.status === 404) {
    shareError.textContent = "Este enlace ya no es válido o el contenido no está disponible.";
    shareError.hidden = false;
    shareGrid.innerHTML = "";
    return;
  }
  if (!res.ok) {
    shareError.textContent = "No se pudo cargar el contenido.";
    shareError.hidden = false;
    return;
  }
  listCache = await res.json();
  writeSharePathState({ push: false });
  clearSelectionState();
  renderBreadcrumb();
  shareGrid.innerHTML = "";
  if (shareDownloadCurrentBtn) {
    shareDownloadCurrentBtn.textContent = pathWithin.length ? "Descargar subcarpeta actual" : "Descargar esta carpeta";
  }
  updateSelectionUi();
  const visible = getFilteredList();
  for (const [idx, item] of visible.entries()) {
    const isFolder = item.itemType === "folder";
    const node = cardTemplate.content.firstElementChild.cloneNode(true);
    const icon = node.querySelector(".file-icon");
    node.querySelector(".file-name").textContent = item.name;
    node.querySelector(".file-info").textContent = isFolder
      ? `Carpeta · ${formatDate(item.addedAt)}`
      : `${formatSize(item.size)} · ${formatDate(item.addedAt)}`;
    if (isFolder) {
      node.classList.add("folder");
    }
    if (window.EyeIcons) {
      window.EyeIcons.setFileIcon(icon, isFolder ? "folder" : "file");
    }
    const go = () => {
      if (isFolder) {
        navigateSharePath([...pathWithin, { id: item.id, name: item.name }], { push: true });
      } else {
        window.location.assign(downloadUrlForSharedItem(item));
      }
    };
    node.addEventListener("click", (ev) => {
      const id = String(item.id);
      if (ev.shiftKey && selectionAnchorIndex >= 0) {
        const a = Math.min(selectionAnchorIndex, idx);
        const b = Math.max(selectionAnchorIndex, idx);
        for (let i = a; i <= b; i++) selectedIds.add(String(visible[i].id));
        updateSelectionUi();
        updateCardsSelectionClass(visible);
        return;
      }
      if (ev.ctrlKey || ev.metaKey) {
        if (selectedIds.has(id)) selectedIds.delete(id);
        else selectedIds.add(id);
        selectionAnchorIndex = idx;
        node.classList.toggle("file-card--selected", selectedIds.has(id));
        updateSelectionUi();
        return;
      }
      go();
    });
    node.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        go();
      }
    });
    node.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      const id = String(item.id);
      if (!selectedIds.has(id)) {
        clearSelectionState();
        selectedIds.add(id);
        selectionAnchorIndex = idx;
        updateCardsSelectionClass(visible);
        updateSelectionUi();
      }
    });
    shareGrid.appendChild(node);
  }
  shareEmpty.hidden = visible.length > 0;
}

async function init() {
  if (!TOKEN_RE.test(token)) {
    shareError.textContent = "Enlace no válido.";
    shareError.hidden = false;
    return;
  }
  const res = await fetch(`/api/share/${encodeURIComponent(token)}/info`);
  if (!res.ok) {
    shareError.textContent = "Este enlace ya no es válido.";
    shareError.hidden = false;
    return;
  }
  const data = await res.json();
  rootId = data.rootId;
  shareFolderName = data.folderName;
  pathWithin = readSharePathState();
  document.title = `${shareFolderName} — compartido`;
  if (window.EyeIcons) {
    const b = document.getElementById("shareBrandIcon");
    if (b) b.innerHTML = window.EyeIcons.eye();
    const e = document.getElementById("shareEmptyIcon");
    if (e) e.innerHTML = window.EyeIcons.folder();
    const s = document.getElementById("shareSearchIcon");
    if (s) s.innerHTML = window.EyeIcons.search();
  }
  await loadList();
}

if (shareSelectAllBtn) {
  shareSelectAllBtn.addEventListener("click", () => {
    clearSelectionState();
    const visible = getFilteredList();
    visible.forEach((x) => selectedIds.add(String(x.id)));
    selectionAnchorIndex = visible.length ? 0 : -1;
    updateCardsSelectionClass(visible);
    updateSelectionUi();
  });
}

if (shareClearSelectionBtn) {
  shareClearSelectionBtn.addEventListener("click", () => {
    clearSelectionState();
    shareGrid.querySelectorAll(".file-card").forEach((card) => card.classList.remove("file-card--selected"));
    updateSelectionUi();
  });
}

if (shareDownloadSelectedBtn) {
  shareDownloadSelectedBtn.addEventListener("click", () => downloadSelection());
}

if (shareSearchInput) {
  shareSearchInput.addEventListener("input", () => loadList());
}

if (shareDownloadCurrentBtn) {
  shareDownloadCurrentBtn.addEventListener("click", () => downloadCurrentFolder());
}

window.addEventListener("popstate", (ev) => {
  pathWithin = normalizeSegments(ev.state?.sharePathWithin);
  clearSelectionState();
  loadList();
});

init();
