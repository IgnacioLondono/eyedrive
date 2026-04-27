/**
 * Iconos SVG para eyedrive
 */
(function () {
  const s =
    'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

  function ico(path, w, h) {
    const W = w || 20;
    const H = h || w || 20;
    const large = W >= 22 ? " icon-svg--lg" : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg${large}" width="${W}" height="${H}" viewBox="0 0 24 24" ${s} aria-hidden="true">${path}</svg>`;
  }

  window.EyeIcons = {
    folder: () =>
      ico(
        '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2l1.5 1.5H19A2.5 2.5 0 0 1 21.5 9V17A2.5 2.5 0 0 1 19 19.5H5.5A2.5 2.5 0 0 1 3 17v-9.5Z"/>'
      ),
    file: () =>
      ico(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/>'
      ),
    fileImage: () =>
      ico(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><circle cx="9" cy="11" r="1.2"/><path d="m7.2 18 3.1-3.2 2.1 2.2 2.7-2.7 1.7 1.7"/>'
      ),
    fileArchive: () =>
      ico(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M10.2 9h3.6"/><path d="M10.2 12h3.6"/><path d="M10.2 15h3.6"/><path d="M10.2 18h3.6"/>'
      ),
    fileCode: () =>
      ico(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="m9.2 12-2.2 2.2 2.2 2.2"/><path d="m14.8 12 2.2 2.2-2.2 2.2"/><path d="m12.9 10.5-1.8 7"/>'
      ),
    filePdf: () =>
      ico(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M8.5 17.5v-5h1.9a1.2 1.2 0 1 1 0 2.4H8.5"/><path d="M12.2 17.5v-5h1.3a2 2 0 0 1 0 4h-1.3"/><path d="M16.3 17.5v-5h2.7"/><path d="M16.3 15.2h2.1"/>'
      ),
    fileAudio: () =>
      ico(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M14.5 11v5.2a1.5 1.5 0 1 1-1-1.4V10l4-.8v4.8a1.5 1.5 0 1 1-1-1.4"/>'
      ),
    fileVideo: () =>
      ico(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><rect x="7.8" y="11.2" width="8.4" height="5.6" rx="1.1"/><path d="m11.3 12.5 2.7 1.5-2.7 1.5z"/>'
      ),
    fileJava: () =>
      ico(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M9.2 17h5.6"/><path d="M10.1 14.5h3.8"/><path d="M11 9.5c.5.4.3.9 0 1.2-.4.4-.4.8.1 1.2"/><path d="M13 9c.7.5.5 1.2.1 1.6-.4.4-.5.9.1 1.4"/>'
      ),
    fileText: () =>
      ico(
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M8.5 11.5h7"/><path d="M8.5 14.5h7"/><path d="M8.5 17.5h4.5"/>'
      ),
    /** Logo / marca: ojo (eyed) */
    eye: () =>
      ico(
        '<path d="M1 12s4-6.5 11-6.5 10 6.5 10 6.5-4 6.5-10 6.5S1 12 1 12Z"/><circle cx="12" cy="12" r="2.75"/>',
        24,
        24
      ),
    cloud: () => ico('<path d="M18 10h-1.5A3.5 3.5 0 0 0 7 9a4 4 0 0 0-1.2 7.8A2.5 2.5 0 0 0 8.5 22H16a4 4 0 0 0 0-8z"/>', 24, 24),
    cloudUpload: () =>
      ico(
        '<path d="M4 15a3 3 0 0 1 2.1-2.8A3.4 3.4 0 0 1 7 5.6 5.5 5.5 0 0 1 16.5 6 3 3 0 0 1 20 8.3 3.3 3.3 0 0 1 17.3 16H5.7A2.5 2.5 0 0 1 4 15Z"/><path d="M12 9v6"/><path d="m9 12 3-3 3 3"/>',
        22,
        22
      ),
    download: () =>
      ico(
        '<path d="M4 16.5a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 16.5"/><path d="M12 4.5v9"/><path d="m8.8 10.7 3.2 3.2 3.2-3.2"/>',
        22,
        22
      ),
    folderPlus: () =>
      ico(
        '<path d="M12 10v4"/><path d="M10 12h4"/><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2l1.5 1.5H19A2.5 2.5 0 0 1 21.5 9V17A2.5 2.5 0 0 1 19 19.5H5.5A2.5 2.5 0 0 1 3 17v-9.5Z"/>'
      ),
    search: () => ico('<circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>', 18, 18),
    refresh: () =>
      ico(
        '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>',
        18,
        18
      ),
    share: () =>
      ico(
        '<circle cx="18" cy="5" r="2.25"/><circle cx="6" cy="12" r="2.25"/><circle cx="18" cy="19" r="2.25"/><path d="M8.5 13.2 15.5 17"/><path d="M15.5 6.8 8.5 11"/>'
      ),
    trash: () =>
      ico(
        '<path d="M3 6h18"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M19 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
        17,
        17
      ),
    copy: () =>
      ico('<rect width="12" height="12" x="8" y="4" rx="1.5"/><path d="M4 16V6.5A1.5 1.5 0 0 1 5.5 5H15"/>', 18, 18),
    mail: () =>
      ico('<rect width="18" height="13" x="3" y="5.5" rx="1.5"/><path d="m3 8.5 8.2 4.3a1.2 1.2 0 0 0 1.2 0L21 8.5"/>', 18, 18),
    moon: () =>
      ico(
        '<path d="M20.2 15.8A8.5 8.5 0 1 1 8.2 3.8a7 7 0 1 0 12 12Z"/>',
        18,
        18
      ),
    sun: () =>
      ico(
        '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v2.2"/><path d="M12 19.3v2.2"/><path d="m4.9 4.9 1.6 1.6"/><path d="m17.5 17.5 1.6 1.6"/><path d="M2.5 12h2.2"/><path d="M19.3 12h2.2"/><path d="m4.9 19.1 1.6-1.6"/><path d="m17.5 6.5 1.6-1.6"/>',
        18,
        18
      ),
    x: () => ico('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 16, 16),
    hardDrive: () =>
      ico(
        '<path d="M22 12a4 4 0 0 0-4-4H4a4 4 0 0 0-2 7.4"/><path d="M18 12v.5"/><path d="M6 12v.5"/><rect width="8" height="2" x="8" y="16" rx="0.5"/>',
        24,
        24
      ),
    setFileIcon: function (el, type, fileName) {
      if (!el) return;
      el.classList.remove("file-icon--folder", "file-icon--file");
      if (type === "folder") {
        el.classList.add("file-icon--folder");
        el.innerHTML = window.EyeIcons.folder();
      } else {
        const ext = String(fileName || "")
          .trim()
          .toLowerCase()
          .split(".")
          .pop();
        const imageExt = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"]);
        const archiveExt = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"]);
        const codeExt = new Set(["js", "ts", "jsx", "tsx", "json", "html", "css", "md", "py", "php", "go", "rs", "c", "cpp", "h", "java", "kt", "sql", "sh", "yml", "yaml"]);
        const audioExt = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac"]);
        const videoExt = new Set(["mp4", "mkv", "avi", "mov", "webm", "m4v"]);
        let iconFn = window.EyeIcons.file;
        if (ext === "jar") iconFn = window.EyeIcons.fileJava;
        else if (ext === "pdf") iconFn = window.EyeIcons.filePdf;
        else if (imageExt.has(ext)) iconFn = window.EyeIcons.fileImage;
        else if (archiveExt.has(ext)) iconFn = window.EyeIcons.fileArchive;
        else if (audioExt.has(ext)) iconFn = window.EyeIcons.fileAudio;
        else if (videoExt.has(ext)) iconFn = window.EyeIcons.fileVideo;
        else if (codeExt.has(ext)) iconFn = window.EyeIcons.fileCode;
        else if (ext) iconFn = window.EyeIcons.fileText;
        el.classList.add("file-icon--file");
        el.innerHTML = iconFn();
      }
    },
  };
})();
