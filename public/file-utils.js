(function () {
  const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif"]);
  const VIDEO_EXT = new Set(["mp4", "mkv", "avi", "mov", "webm", "m4v"]);
  const AUDIO_EXT = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac"]);
  const ARCHIVE_EXT = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"]);
  const CODE_EXT = new Set([
    "js",
    "ts",
    "jsx",
    "tsx",
    "json",
    "html",
    "css",
    "md",
    "py",
    "php",
    "go",
    "rs",
    "java",
    "kt",
    "sql",
    "sh",
    "yml",
    "yaml",
  ]);

  function fileExtension(name) {
    const parts = String(name || "")
      .trim()
      .toLowerCase()
      .split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  function isImageItem(item) {
    if (!item || item.itemType === "folder") return false;
    const mime = String(item.mimeType || "").toLowerCase();
    if (mime === "image/svg+xml") return false;
    if (mime.startsWith("image/")) return true;
    const ext = fileExtension(item.name);
    return ext !== "svg" && IMAGE_EXT.has(ext);
  }

  function getFileKindLabel(item) {
    if (!item || item.itemType === "folder") return "Carpeta";
    const mime = String(item.mimeType || "").toLowerCase();
    const ext = fileExtension(item.name).toUpperCase() || "ARCHIVO";
    if (mime.startsWith("image/") || IMAGE_EXT.has(ext.toLowerCase())) return `Imagen · ${ext}`;
    if (mime.startsWith("video/") || VIDEO_EXT.has(ext.toLowerCase())) return `Vídeo · ${ext}`;
    if (mime.startsWith("audio/") || AUDIO_EXT.has(ext.toLowerCase())) return `Audio · ${ext}`;
    if (mime === "application/pdf" || ext === "PDF") return "PDF";
    if (ARCHIVE_EXT.has(ext.toLowerCase())) return `Comprimido · ${ext}`;
    if (CODE_EXT.has(ext.toLowerCase())) return `Código · ${ext}`;
    if (ext === "JAR") return "Java · JAR";
    return ext;
  }

  function applyFileCardIcon(icon, item, previewUrl) {
    if (!icon) return;
    icon.classList.remove("file-icon--preview", "file-icon--folder", "file-icon--file");
    icon.innerHTML = "";

    const isFolder = item.itemType === "folder";
    if (isFolder) {
      if (window.EyeIcons) window.EyeIcons.setFileIcon(icon, "folder", item.name || "");
      return;
    }

    if (isImageItem(item) && previewUrl) {
      icon.classList.add("file-icon--preview", "file-icon--file");
      const img = document.createElement("img");
      img.src = previewUrl;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener(
        "error",
        () => {
          icon.classList.remove("file-icon--preview");
          icon.innerHTML = "";
          if (window.EyeIcons) window.EyeIcons.setFileIcon(icon, "file", item.name || "");
        },
        { once: true }
      );
      icon.appendChild(img);
      return;
    }

    if (window.EyeIcons) window.EyeIcons.setFileIcon(icon, "file", item.name || "");
  }

  window.EyeFiles = {
    isImageItem,
    getFileKindLabel,
    applyFileCardIcon,
  };
})();
