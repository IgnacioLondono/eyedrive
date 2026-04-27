const token = (typeof window !== "undefined" && window.__SHARE_TOKEN__) || "";
const shareBreadcrumb = document.getElementById("shareBreadcrumb");
const shareGrid = document.getElementById("shareGrid");
const shareEmpty = document.getElementById("shareEmpty");
const shareError = document.getElementById("shareError");
const cardTemplate = document.getElementById("shareCardTemplate");

const TOKEN_RE = /^[0-9a-f]{64}$/i;
/** @type {string} */
let rootId = "";
/** @type {string} */
let shareFolderName = "";
/** @type {{ id: string, name: string }[]} */
let pathWithin = [];
/** @type {any[]} */
let listCache = [];

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

function renderBreadcrumb() {
  shareBreadcrumb.innerHTML = "";
  const root = document.createElement("button");
  root.type = "button";
  root.className = "crumb";
  root.textContent = shareFolderName;
  root.addEventListener("click", () => {
    pathWithin = [];
    loadList();
  });
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
    b.addEventListener("click", () => {
      pathWithin = pathWithin.slice(0, index + 1);
      loadList();
    });
    shareBreadcrumb.appendChild(b);
  });
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
  renderBreadcrumb();
  shareGrid.innerHTML = "";
  for (const item of listCache) {
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
        pathWithin = [...pathWithin, { id: item.id, name: item.name }];
        loadList();
      } else {
        window.location.assign(
          `/api/share/${encodeURIComponent(token)}/file/${encodeURIComponent(item.id)}/download`
        );
      }
    };
    node.addEventListener("click", go);
    node.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        go();
      }
    });
    shareGrid.appendChild(node);
  }
  shareEmpty.hidden = listCache.length > 0;
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
  pathWithin = [];
  document.title = `${shareFolderName} — compartido`;
  if (window.EyeIcons) {
    const b = document.getElementById("shareBrandIcon");
    if (b) b.innerHTML = window.EyeIcons.eye();
    const e = document.getElementById("shareEmptyIcon");
    if (e) e.innerHTML = window.EyeIcons.folder();
  }
  await loadList();
}

init();
