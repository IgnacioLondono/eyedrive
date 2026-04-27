/**
 * Iconos SVG para eyedcomundrive
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
    cloud: () => ico('<path d="M18 10h-1.5A3.5 3.5 0 0 0 7 9a4 4 0 0 0-1.2 7.8A2.5 2.5 0 0 0 8.5 22H16a4 4 0 0 0 0-8z"/>', 24, 24),
    cloudUpload: () =>
      ico(
        '<path d="M4 15a3 3 0 0 1 2.1-2.8A3.4 3.4 0 0 1 7 5.6 5.5 5.5 0 0 1 16.5 6 3 3 0 0 1 20 8.3 3.3 3.3 0 0 1 17.3 16H5.7A2.5 2.5 0 0 1 4 15Z"/><path d="M12 9v6"/><path d="m9 12 3-3 3 3"/>',
        22,
        22
      ),
    plus: () => ico('<path d="M12 5v14"/><path d="M5 12h14"/>', 20, 20),
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
    x: () => ico('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 16, 16),
    hardDrive: () =>
      ico(
        '<path d="M22 12a4 4 0 0 0-4-4H4a4 4 0 0 0-2 7.4"/><path d="M18 12v.5"/><path d="M6 12v.5"/><rect width="8" height="2" x="8" y="16" rx="0.5"/>',
        24,
        24
      ),
    setFileIcon: function (el, type) {
      if (!el) return;
      el.classList.remove("file-icon--folder", "file-icon--file");
      if (type === "folder") {
        el.classList.add("file-icon--folder");
        el.innerHTML = window.EyeIcons.folder();
      } else {
        el.classList.add("file-icon--file");
        el.innerHTML = window.EyeIcons.file();
      }
    },
  };
})();
