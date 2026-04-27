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

/** @type {{ url: string, name: string }} */
let lastShare = { url: "", name: "" };

function initDecorIcons() {
  if (!window.EyeIcons) return;
  const I = window.EyeIcons;
  const fill = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = fn();
  };
  fill("brandIcon", () => I.cloud());
  fill("icUpload", () => I.cloudUpload());
  fill("icNewFolder", () => I.folderPlus());
  fill("icSearch", () => I.search());
  fill("icRefresh", () => I.refresh());
  fill("icNavDrive", () => I.hardDrive());
  fill("icDropzone", () => I.cloudUpload());
  fill("icContentHead", () => I.hardDrive());
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

uploadBtn.addEventListener("click", () => fileInput.click());
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

newFolderBtn.addEventListener("click", async () => {
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
});

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

/**
 * @param {File[]} incoming
 * @param {string[] | null} relativePaths mismo índice que incoming, o null = archivos en la carpeta actual
 */
async function uploadFiles(incoming, relativePaths) {
  if (!incoming.length) return;
  const form = new FormData();
  const pid = currentParentId();
  if (pid) form.append("parentId", pid);
  const usePaths = Array.isArray(relativePaths) && relativePaths.length === incoming.length;
  for (let i = 0; i < incoming.length; i++) {
    form.append("files", incoming[i]);
    if (usePaths) {
      form.append("relativePaths", relativePaths[i] || "");
    }
  }
  try {
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (res.status === 413) {
      alert("Algún archivo supera el tamaño máximo o hay demasiados archivos de una vez.");
      return;
    }
    if (res.status === 409) {
      alert("Conflicto de nombre. Renombra el archivo o la carpeta destino.");
      return;
    }
    if (!res.ok) throw new Error("upload");
    await loadItems();
  } catch (e) {
    console.error(e);
    alert("Error al subir archivos.");
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

    const shareBtn = node.querySelector(".share-link-btn");
    const delBtn = node.querySelector(".delete-btn");
    if (isFolder) {
      shareBtn.hidden = false;
      const sic = shareBtn.querySelector(".icon-btn-ic");
      if (sic && window.EyeIcons) sic.innerHTML = window.EyeIcons.share();
      shareBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openShareFolder(item);
      });
    } else {
      shareBtn.remove();
    }
    const delIc = delBtn.querySelector(".icon-btn-ic");
    if (delIc && window.EyeIcons) delIc.innerHTML = window.EyeIcons.trash();

    const open = () => {
      if (isFolder) {
        pathSegments = [...pathSegments, { id: item.id, name: item.name }];
        loadItems();
      } else {
        window.location.assign(`/api/files/${item.id}/download`);
      }
    };

    node.addEventListener("click", (ev) => {
      if (ev.target.closest(".icon-btn") || ev.target.closest(".delete-btn") || ev.target.closest(".share-link-btn"))
        return;
      open();
    });
    node.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        open();
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
