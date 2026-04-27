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
const dropzone = document.getElementById("dropzone");
const cardTemplate = document.getElementById("fileCardTemplate");
const breadcrumb = document.getElementById("breadcrumb");
const navDrive = document.getElementById("navDrive");
const shareDialog = document.getElementById("shareDialog");
const shareUrlInput = document.getElementById("shareUrlInput");
const shareCopyBtn = document.getElementById("shareCopyBtn");
const shareEmailBtn = document.getElementById("shareEmailBtn");
const shareCloseBtn = document.getElementById("shareCloseBtn");
const pickFilesBtn = document.getElementById("pickFilesBtn");
const shareCurrentFolderBtn = document.getElementById("shareCurrentFolderBtn");
const contextMenu = document.getElementById("contextMenu");
const mainContent = document.querySelector("main.content");
const sidebar = document.querySelector("aside.sidebar");

/** @type {{ url: string, name: string }} */
let lastShare = { url: "", name: "" };

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
  fill("icShareCurrent", () => I.share());
  fill("icEmpty", () => I.folder());
  fill("icFolderTree", () => I.folder());
  fill("icDialogShare", () => I.share());
  fill("icCopy", () => I.copy());
  fill("icMail", () => I.mail());
}

/** @type {{ id: string, name: string }[]} */
let pathSegments = [];
/** @type {any[]} */
let allItems = [];

function currentParentId() {
  if (!pathSegments.length) return null;
  return pathSegments[pathSegments.length - 1].id;
}

function currentFolder() {
  if (!pathSegments.length) return null;
  return pathSegments[pathSegments.length - 1];
}

function updateInFolderTools() {
  const inside = pathSegments.length > 0;
  if (shareCurrentFolderBtn) shareCurrentFolderBtn.hidden = !inside;
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
    pathSegments = [];
    fileInput.value = "";
    loadItems();
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
      pathSegments = pathSegments.slice(0, index + 1);
      fileInput.value = "";
      loadItems();
    });
    breadcrumb.appendChild(btn);
  });
}

function applySearchFilter() {
  const term = searchInput.value.trim().toLowerCase();
  const filtered = term
    ? allItems.filter((item) => item.name.toLowerCase().includes(term))
    : allItems;
  renderItems(filtered);
}

async function loadItems() {
  try {
    allItems = await apiList();
    renderBreadcrumb();
    updateInFolderTools();
    applySearchFilter();
    fileCount.textContent = `${allItems.length} elemento${allItems.length === 1 ? "" : "s"}`;
  } catch (e) {
    console.error(e);
    alert("No se pudo cargar. Comprueba la conexión e inténtalo de nuevo.");
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
      alert("No se pudo crear el enlace.");
      return;
    }
    const data = await res.json();
    lastShare = {
      url: `${location.origin}${data.path}`,
      name: item.name,
    };
    shareUrlInput.value = lastShare.url;
    shareDialog.showModal();
  } catch (e) {
    console.error(e);
    alert("No se pudo crear el enlace.");
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
    const folder = currentFolder();
    if (folder) openShareFolder({ id: folder.id, name: folder.name });
  });
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
  const name = window.prompt("Nombre de la carpeta:");
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
      alert("Ya hay un archivo o carpeta con ese nombre en esta ubicación.");
      return;
    }
    if (!res.ok) throw new Error("create folder");
    await loadItems();
  } catch (e) {
    console.error(e);
    alert("No se pudo crear la carpeta.");
  }
}

newFolderBtn.addEventListener("click", createNewFolder);

searchInput.addEventListener("input", () => applySearchFilter());

refreshBtn.addEventListener("click", () => loadItems());

navDrive.addEventListener("click", (e) => {
  e.preventDefault();
  pathSegments = [];
  loadItems();
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

/**
 * @param {File[]} incoming
 * @param {string[] | null} relativePaths mismo índice que incoming, o null = archivos en la carpeta actual
 */
async function uploadFiles(incoming, relativePaths) {
  if (!incoming.length) return;
  const pid = currentParentId();
  const usePaths = Array.isArray(relativePaths) && relativePaths.length === incoming.length;
  const total = incoming.length;
  let uploaded = 0;
  const dropEl = document.getElementById("dropzone");
  const setProgress = (msg) => {
    if (dropEl) {
      const t = dropEl.querySelector(".dropzone-text");
      if (t && total > UPLOAD_BATCH_SIZE) t.innerHTML = `<strong>${msg}</strong><span>Total: ${total} archivos</span>`;
    }
  };

  try {
    for (let start = 0; start < total; start += UPLOAD_BATCH_SIZE) {
      const end = Math.min(start + UPLOAD_BATCH_SIZE, total);
      if (total > UPLOAD_BATCH_SIZE) {
        setProgress(`Subiendo… ${end} de ${total}`);
      }
      const form = new FormData();
      if (pid) form.append("parentId", pid);
      for (let i = start; i < end; i++) {
        form.append("files", incoming[i]);
        if (usePaths) {
          form.append("relativePaths", relativePaths[i] || "");
        }
      }
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.status === 413) {
        alert("Algún archivo supera el tamaño máximo o el servidor rechaza el lote (revisa MAX_FILES en Docker).");
        return;
      }
      if (res.status === 409) {
        alert("Conflicto de nombre. Renombra o vacía un poco el destino e inténtalo de nuevo.");
        return;
      }
      if (!res.ok) throw new Error("upload");
      uploaded = end;
    }
    if (dropEl) {
      const t = dropEl.querySelector(".dropzone-text");
      if (t) {
        t.innerHTML = `<strong>Suelta archivos aquí</strong><span>ZIP, RAR, JAR, EXE, MSI, ISO u carpetas (arrastre o «Subir carpeta»)</span>`;
      }
    }
    await loadItems();
  } catch (e) {
    console.error(e);
    if (dropEl) {
      const t = dropEl.querySelector(".dropzone-text");
      if (t) {
        t.innerHTML = `<strong>Suelta archivos aquí</strong><span>ZIP, RAR, JAR, EXE, MSI, ISO u carpetas (arrastre o «Subir carpeta»)</span>`;
      }
    }
    if (uploaded > 0 && uploaded < total) {
      alert(`Se subieron ${uploaded} de ${total} archivos. El resto falló o canceló.`);
    } else {
      alert("Error al subir archivos.");
    }
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
function openItem(item) {
  if (item.itemType === "folder") {
    pathSegments = [...pathSegments, { id: item.id, name: item.name }];
    fileInput.value = "";
    loadItems();
  } else {
    window.location.assign(`/api/files/${item.id}/download`);
  }
}

/**
 * @param {any} item
 */
function showItemInfo(item) {
  const isFolder = item.itemType === "folder";
  const line1 = isFolder
    ? `Carpeta: ${item.name}`
    : `Archivo: ${item.name} (${formatSize(item.size)})`;
  const lines = [line1, `Añadido: ${formatDate(item.addedAt)}`, `Id: ${item.id}`];
  alert(lines.join("\n"));
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
  pathSegments = [];
  fileInput.value = "";
  searchInput.value = "";
  loadItems();
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
    btn.disabled = !!e.disabled;
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
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
  const items = [
    { label: "Elegir archivos", run: openFilePicker },
    { label: "Subir carpeta", run: openFolderTreePicker },
    { label: "Nueva carpeta", run: createNewFolder },
    { separator: true },
    { label: "Actualizar", run: () => loadItems() },
  ];
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
  if (isFolder) {
    return [
      { label: "Abrir", run: () => openItem(item) },
      { label: "Compartir", run: () => openShareFolder(item) },
      { label: "Copiar nombre", run: () => copyString(item.name) },
      { separator: true },
      { label: "Información", run: () => showItemInfo(item) },
      { label: "Eliminar", run: () => removeItem(item.id), danger: true },
    ];
  }
  return [
    { label: "Abrir o descargar", run: () => openItem(item) },
    { label: "Abrir en otra pestaña", run: () => openFileDownloadNewTab(item) },
    { label: "Copiar enlace de descarga", run: () => copyString(downloadUrlForFile(item)) },
    { label: "Copiar nombre", run: () => copyString(item.name) },
    { separator: true },
    { label: "Información", run: () => showItemInfo(item) },
    { label: "Eliminar", run: () => removeItem(item.id), danger: true },
  ];
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

async function removeItem(id) {
  if (!window.confirm("¿Eliminar? Si es una carpeta, se borrará todo su contenido.")) return;
  try {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.status === 404) {
      alert("No encontrado.");
      return;
    }
    if (!res.ok) throw new Error("delete");
    await loadItems();
  } catch (e) {
    console.error(e);
    alert("Error al eliminar.");
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
      window.EyeIcons.setFileIcon(icon, isFolder ? "folder" : "file");
    }

    const delBtn = node.querySelector(".delete-btn");
    const delIc = delBtn.querySelector(".icon-btn-ic");
    if (delIc && window.EyeIcons) delIc.innerHTML = window.EyeIcons.trash();

    node.dataset.itemId = String(item.id);

    node.addEventListener("click", (ev) => {
      if (ev.target.closest(".icon-btn") || ev.target.closest(".delete-btn")) return;
      openItem(item);
    });
    node.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openItem(item);
      }
    });

    delBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      removeItem(item.id);
    });
    fileGrid.appendChild(node);
  }

  emptyState.hidden = list.length > 0;
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

initDecorIcons();
loadItems();
