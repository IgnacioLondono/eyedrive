"use client";

import { motion } from "framer-motion";
import { CloudUpload, Download, FolderPlus, LayoutGrid, Share2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DriveContextMenu, type ContextMenuEntry } from "@/components/drive/drive-context-menu";
import { DriveShell } from "@/components/drive/drive-shell";
import { MoveDestinationDialog } from "@/components/drive/move-destination-dialog";
import { SidebarTree } from "@/components/drive/sidebar-tree";
import {
  authApi,
  createFolder,
  createShare,
  deleteItem,
  downloadItemUrl,
  fetchItemTree,
  listItems,
  moveItems,
  previewItemUrl,
  renameFolder,
  uploadFiles,
} from "@/lib/api";
import { clearSessionToken } from "@/lib/auth";
import { getFileIcon, getFileKindLabel, isImageItem } from "@/lib/files";
import { currentPathLabel } from "@/lib/folder-paths";
import { ensureExpandedForPath, type FlatTreeItem } from "@/lib/tree";
import type { DriveItem, PathSegment, User as AppUser } from "@/lib/types";
import { cn, formatDate, formatSize } from "@/lib/utils";

const NAV_KEY = "eyedrive.nav.pathSegments.v1";

function normalizeSegments(raw: unknown): PathSegment[] {
  if (!Array.isArray(raw)) return [];
  const out: PathSegment[] = [];
  for (const seg of raw) {
    if (!seg || typeof seg !== "object") continue;
    const id = typeof (seg as PathSegment).id === "string" ? (seg as PathSegment).id.trim() : "";
    const name = typeof (seg as PathSegment).name === "string" ? (seg as PathSegment).name.trim() : "";
    if (!id || !name) continue;
    out.push({ id, name });
  }
  return out;
}

function readPersistedPathSegments(): PathSegment[] {
  try {
    const fromHistory = normalizeSegments((history.state as { pathSegments?: unknown } | null)?.pathSegments);
    if (fromHistory.length) return fromHistory;
  } catch {
    /* ignore */
  }
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    if (!raw) return [];
    return normalizeSegments(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writePersistedPathSegments(segments: PathSegment[], { push }: { push: boolean }) {
  const clean = normalizeSegments(segments);
  const state = { ...(history.state || {}), pathSegments: clean };
  if (push) history.pushState(state, "", window.location.href);
  else history.replaceState(state, "", window.location.href);
  try {
    sessionStorage.setItem(NAV_KEY, JSON.stringify(clean));
  } catch {
    /* ignore */
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

export function DriveApp({ user }: { user: AppUser }) {
  const router = useRouter();
  const [path, setPath] = useState<PathSegment[]>(() =>
    typeof window !== "undefined" ? readPersistedPathSegments() : []
  );
  const [items, setItems] = useState<DriveItem[]>([]);
  const [treeFlat, setTreeFlat] = useState<FlatTreeItem[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["ROOT"]));
  const [rootExpanded, setRootExpanded] = useState(true);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entries: ContextMenuEntry[] } | null>(null);
  const [moveItemIds, setMoveItemIds] = useState<string[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const parentId = path.length ? path[path.length - 1].id : null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, tree] = await Promise.all([listItems(parentId), fetchItemTree()]);
      setItems(list);
      setTreeFlat(tree);
      setSelected(new Set());
    } catch (e) {
      if (e instanceof Error && e.message === "No autenticado") router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [parentId, router]);

  useEffect(() => {
    const onPopState = (ev: PopStateEvent) => {
      const next = normalizeSegments((ev.state as { pathSegments?: unknown } | null)?.pathSegments);
      setPath(next);
      setSearch("");
      setSelected(new Set());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    writePersistedPathSegments(path, { push: false });
    setExpanded((prev) => ensureExpandedForPath(prev, path));
    refresh();
  }, [path, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector("dialog[open]")) return;
      if (contextMenu) {
        setContextMenu(null);
        return;
      }
      if (selected.size > 0) {
        e.preventDefault();
        setSelected(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contextMenu, selected.size]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const selectedItems = useMemo(
    () => visible.filter((i) => selected.has(i.id)),
    [visible, selected]
  );

  const selectedFiles = useMemo(
    () => selectedItems.filter((i) => i.itemType === "file"),
    [selectedItems]
  );

  function navigate(segments: PathSegment[], opts?: { push?: boolean; clearSearch?: boolean }) {
    const clean = normalizeSegments(segments);
    setPath(clean);
    setSelected(new Set());
    if (opts?.clearSearch) setSearch("");
    writePersistedPathSegments(clean, { push: Boolean(opts?.push) });
  }

  function openContextMenu(x: number, y: number, entries: ContextMenuEntry[]) {
    setContextMenu({ x, y, entries });
  }

  function openItem(item: DriveItem) {
    if (item.itemType === "folder") {
      navigate([...path, { id: item.id, name: item.name }], { push: true });
      return;
    }
    if (isImageItem(item.name, item.mimeType, item.itemType)) {
      window.open(previewItemUrl(item.id), "_blank", "noopener,noreferrer");
      return;
    }
    window.location.assign(downloadItemUrl(item));
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploadPct(0);
    try {
      await uploadFiles(Array.from(files), parentId, undefined, setUploadPct);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploadPct(null);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    onUpload(e.dataTransfer.files);
  }

  async function submitNewFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createFolder(name, parentId);
      setNewFolderName("");
      setNewFolderOpen(false);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  async function onDeleteOne(item: DriveItem) {
    if (!confirm(`¿Eliminar «${item.name}»?`)) return;
    try {
      await deleteItem(item.id);
      await refresh();
    } catch {
      alert("No se pudo eliminar");
    }
  }

  async function onDeleteMany(ids: string[]) {
    if (!ids.length) return;
    const msg =
      ids.length === 1
        ? "¿Eliminar? Si es una carpeta, se borrará todo su contenido."
        : `¿Eliminar ${ids.length} elementos? Las carpetas borrarán todo su contenido.`;
    if (!confirm(msg)) return;
    for (const id of ids) {
      try {
        await deleteItem(id);
      } catch {
        /* continue */
      }
    }
    await refresh();
  }

  async function onShareFolder(item: DriveItem) {
    try {
      const url = await createShare(item.id);
      setShareUrl(url);
    } catch {
      alert("No se pudo crear el enlace");
    }
  }

  async function onRenameFolder(item: DriveItem) {
    const name = prompt("Nuevo nombre", item.name);
    if (!name?.trim() || name === item.name) return;
    try {
      await renameFolder(item.id, name.trim());
      await refresh();
    } catch {
      alert("No se pudo renombrar");
    }
  }

  function showItemInfo(item: DriveItem) {
    const isFolder = item.itemType === "folder";
    const kind = getFileKindLabel(item.name, item.mimeType, item.itemType);
    const line1 = isFolder ? `Carpeta: ${item.name}` : `${kind}: ${item.name} (${formatSize(item.size)})`;
    alert([line1, `Añadido: ${formatDate(item.addedAt)}`, `Id: ${item.id}`].join("\n"));
  }

  function downloadSelectedFiles() {
    if (!selectedFiles.length) {
      alert("En la selección no hay archivos.");
      return;
    }
    selectedFiles.forEach((f, i) => {
      window.setTimeout(() => {
        window.open(downloadItemUrl(f), "_blank", "noopener,noreferrer");
      }, i * 250);
    });
  }

  function startMove(ids: string[]) {
    if (!ids.length) {
      alert("Selecciona al menos un elemento.");
      return;
    }
    setMoveItemIds(ids);
  }

  async function confirmMove(targetParentId: string | null) {
    const ids = moveItemIds;
    setMoveItemIds(null);
    if (!ids?.length) return;
    try {
      await moveItems(ids, targetParentId);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo mover");
    }
  }

  const moveBlockedFolders = useMemo(() => {
    const blocked = new Set<string>();
    if (!moveItemIds) return blocked;
    for (const id of moveItemIds) {
      const item = items.find((i) => i.id === id) || visible.find((i) => i.id === id);
      if (item?.itemType === "folder") blocked.add(id);
    }
    return blocked;
  }, [moveItemIds, items, visible]);

  const newFolderLabel = path.length ? "Nueva subcarpeta" : "Nueva carpeta";
  const pathLabel = currentPathLabel(path);
  const currentFolder = path.length ? path[path.length - 1] : null;

  const buildBackgroundMenu = (): ContextMenuEntry[] => {
    const hasSearch = search.trim().length > 0;
    const inside = path.length > 0;
    const nSel = selected.size;
    const nFiles = selectedFiles.length;
    const menu: ContextMenuEntry[] = [
      { label: "Elegir archivos", action: () => fileRef.current?.click() },
      { label: "Subir carpeta", action: () => folderRef.current?.click() },
      { label: newFolderLabel, action: () => setNewFolderOpen(true) },
      { type: "separator" },
    ];
    if (visible.length) {
      menu.push({ label: "Seleccionar todos (esta vista)", action: () => setSelected(new Set(visible.map((i) => i.id))) });
    }
    if (nSel) {
      menu.push(
        { label: "Quitar selección", action: () => setSelected(new Set()) },
        { label: nSel > 1 ? `Mover ${nSel} seleccionados` : "Mover seleccionado", action: () => startMove([...selected]) },
        {
          label: `Descargar archivos de la selección${nFiles ? ` (${nFiles})` : ""}`,
          action: downloadSelectedFiles,
          disabled: nFiles === 0,
        },
        {
          label: nSel > 1 ? `Eliminar ${nSel} seleccionados` : "Eliminar seleccionado",
          action: () => onDeleteMany([...selected]),
          danger: true,
        }
      );
    }
    menu.push({ type: "separator" }, { label: "Actualizar", action: refresh });
    if (hasSearch) menu.push({ label: "Limpiar búsqueda", action: () => setSearch("") });
    if (inside) {
      menu.push(
        { type: "separator" },
        { label: "Volver a Mi unidad", action: () => navigate([], { push: true }) },
        {
          label: "Compartir esta carpeta",
          action: () =>
            currentFolder &&
            onShareFolder({ id: currentFolder.id, name: currentFolder.name, itemType: "folder", size: 0, addedAt: "" }),
        },
        { label: "Copiar ruta", action: () => copyText(pathLabel) }
      );
    } else {
      menu.push({ type: "separator" }, { label: "Copiar ruta (Mi unidad)", action: () => copyText(pathLabel) });
    }
    return menu;
  };

  const buildBreadcrumbMenu = (): ContextMenuEntry[] => {
    const menu: ContextMenuEntry[] = [{ label: "Copiar ruta", action: () => copyText(pathLabel) }];
    if (path.length) menu.push({ type: "separator" }, { label: "Ir a Mi unidad", action: () => navigate([], { push: true }) });
    return menu;
  };

  const buildItemMenu = (item: DriveItem): ContextMenuEntry[] => {
      const isFolder = item.itemType === "folder";
      const inSel = selected.has(item.id);
      const nSel = selected.size;
      const nFilesInSel = selectedFiles.length;
      const menu: ContextMenuEntry[] = [
        {
          label: "Seleccionar solo este",
          action: () => setSelected(new Set([item.id])),
        },
        {
          label: inSel ? "Quitar de la selección" : "Añadir a la selección",
          action: () =>
            setSelected((s) => {
              const n = new Set(s);
              if (n.has(item.id)) n.delete(item.id);
              else n.add(item.id);
              return n;
            }),
        },
      ];
      if (visible.length) {
        menu.push({ label: "Seleccionar todos (esta vista)", action: () => setSelected(new Set(visible.map((i) => i.id))) });
      }
      if (nSel) menu.push({ label: "Quitar toda la selección", action: () => setSelected(new Set()) });
      menu.push({ type: "separator" });

      if (nSel >= 2 && inSel) {
        menu.push(
          { label: `Mover ${nSel} seleccionados`, action: () => startMove([...selected]) },
          {
            label: `Descargar archivos de la selección${nFilesInSel ? ` (${nFilesInSel})` : ""}`,
            action: downloadSelectedFiles,
            disabled: nFilesInSel === 0,
          },
          { label: `Eliminar ${nSel} seleccionados`, action: () => onDeleteMany([...selected]), danger: true },
          { type: "separator" }
        );
      }

      const deleteLabel = nSel > 1 ? "Eliminar solo este" : "Eliminar";

      if (isFolder) {
        menu.push(
          { label: "Abrir", action: () => openItem(item) },
          { label: "Renombrar carpeta…", action: () => onRenameFolder(item) },
          { label: "Descargar", action: () => window.location.assign(downloadItemUrl(item)) },
          { label: "Mover…", action: () => startMove([item.id]) },
          { label: "Compartir", action: () => onShareFolder(item) },
          { label: "Copiar nombre", action: () => copyText(item.name) },
          { type: "separator" },
          { label: "Información", action: () => showItemInfo(item) },
          { label: deleteLabel, action: () => onDeleteOne(item), danger: true }
        );
      } else {
        menu.push(
          { label: "Abrir o descargar", action: () => openItem(item) },
          { label: "Descargar", action: () => window.location.assign(downloadItemUrl(item)) },
          { label: "Mover…", action: () => startMove([item.id]) },
          { label: "Abrir en otra pestaña", action: () => window.open(downloadItemUrl(item), "_blank", "noopener,noreferrer") },
          { label: "Copiar enlace de descarga", action: () => copyText(downloadItemUrl(item)) },
          { label: "Copiar nombre", action: () => copyText(item.name) },
          { type: "separator" },
          { label: "Información", action: () => showItemInfo(item) },
          { label: deleteLabel, action: () => onDeleteOne(item), danger: true }
        );
      }
      return menu;
  };

  function handleBackgroundContextMenu(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("input, textarea, select, button, [role='menu']")) return;
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, buildBackgroundMenu());
  }

  function handleAreaContextMenu(e: React.MouseEvent, area: "breadcrumb" | "sidebar") {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, area === "breadcrumb" ? buildBreadcrumbMenu() : buildBackgroundMenu());
  }

  async function logout() {
    await authApi.logout();
    clearSessionToken();
    router.replace("/login");
  }

  return (
    <>
      <DriveShell
        user={user}
        path={path}
        onNavigate={(segments) => navigate(segments, { push: true })}
        search={search}
        onSearchChange={setSearch}
        onRefresh={refresh}
        onAreaContextMenu={handleAreaContextMenu}
        onLogout={logout}
        sidebar={(shellNavigate) => (
          <SidebarTree
            flat={treeFlat}
            path={path}
            expanded={expanded}
            rootExpanded={rootExpanded}
            onToggleRoot={() => {
              setRootExpanded((v) => !v);
              if (!rootExpanded) setExpanded((s) => new Set(s).add("ROOT"));
            }}
            onToggleFolder={(id) =>
              setExpanded((s) => {
                const n = new Set(s);
                if (n.has(id)) n.delete(id);
                else n.add(id);
                return n;
              })
            }
            onNavigateFolder={shellNavigate}
            onOpenFile={openItem}
          />
        )}
        toolbar={
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110 sm:gap-2 sm:px-4"
            >
              <CloudUpload className="h-4 w-4" />
              <span>Subir</span>
            </button>
            <button
              type="button"
              onClick={() => setNewFolderOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm font-medium transition hover:border-[var(--text)] sm:gap-2 sm:px-4"
            >
              <FolderPlus className="h-4 w-4" />
              <span className="max-[380px]:hidden">Nueva carpeta</span>
            </button>
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              className="hidden items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm transition hover:border-[var(--text)] sm:inline-flex"
            >
              Subir carpeta
            </button>
            {currentFolder && (
              <button
                type="button"
                onClick={() =>
                  onShareFolder({
                    id: currentFolder.id,
                    name: currentFolder.name,
                    itemType: "folder",
                    size: 0,
                    addedAt: "",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-2 text-sm transition hover:border-[var(--text)] sm:gap-2 sm:px-4"
              >
                <Share2 className="h-4 w-4" />
                <span className="max-[380px]:hidden">Compartir</span>
              </button>
            )}
            <span className="ml-auto flex items-center gap-1 text-xs text-[var(--muted)] sm:gap-1.5 sm:text-sm">
              <LayoutGrid className="h-4 w-4" />
              {visible.length} elemento{visible.length === 1 ? "" : "s"}
              {selected.size > 0 && ` · ${selected.size} seleccionado${selected.size === 1 ? "" : "s"}`}
            </span>
          </>
        }
      >
        {uploadPct !== null && (
          <div className="mx-3 mt-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm sm:mx-6 sm:mt-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Subiendo archivos…</span>
              <span className="font-medium">{uploadPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-deep)]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]"
                animate={{ width: `${uploadPct}%` }}
              />
            </div>
          </div>
        )}

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-5" onContextMenu={handleBackgroundContextMenu}>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-4 lg:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--panel)]" />
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]",
                  dragOver && "border-[var(--accent)] bg-[var(--panel-deep)] text-[var(--text)]",
                  visible.length === 0 ? "py-24" : "mb-4 py-6 sm:py-8"
                )}
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-2xl bg-[var(--panel-deep)]",
                    visible.length === 0 ? "mb-4 h-16 w-16" : "mb-3 h-12 w-12"
                  )}
                >
                  <CloudUpload className={cn("opacity-50", visible.length === 0 ? "h-8 w-8" : "h-6 w-6")} />
                </div>
                {visible.length === 0 ? (
                  <>
                    <p className="text-lg font-medium text-[var(--text)]">Esta carpeta está vacía</p>
                    <p className="mt-1 text-sm">Arrastra archivos aquí o pulsa para subir</p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium text-[var(--text)]">Suelta archivos aquí</p>
                    <p className="mt-1 text-sm">Arrastra archivos o pulsa para subir en esta carpeta</p>
                  </>
                )}
              </button>
              {visible.length > 0 && (
                <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-4 lg:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
                  {visible.map((item) => (
                    <FileCard
                      key={item.id}
                      item={item}
                      selected={selected.has(item.id)}
                      onToggleSelect={(multi) => {
                        if (multi) {
                          setSelected((s) => {
                            const n = new Set(s);
                            if (n.has(item.id)) n.delete(item.id);
                            else n.add(item.id);
                            return n;
                          });
                        } else {
                          openItem(item);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openContextMenu(e.clientX, e.clientY, buildItemMenu(item));
                      }}
                      onDelete={() => onDeleteOne(item)}
                      onDownload={() => window.location.assign(downloadItemUrl(item))}
                      onRename={item.itemType === "folder" ? () => onRenameFolder(item) : undefined}
                      onShare={item.itemType === "folder" ? () => onShareFolder(item) : undefined}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </DriveShell>

      <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
      <input
        ref={folderRef}
        type="file"
        // @ts-expect-error webkitdirectory no está en los tipos de React
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={(e) => onUpload(e.target.files)}
      />

      {contextMenu && (
        <DriveContextMenu x={contextMenu.x} y={contextMenu.y} entries={contextMenu.entries} onClose={() => setContextMenu(null)} />
      )}

      {moveItemIds && (
        <MoveDestinationDialog
          blockedFolderIds={moveBlockedFolders}
          onCancel={() => setMoveItemIds(null)}
          onConfirm={confirmMove}
        />
      )}

      {newFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => setNewFolderOpen(false)}>
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nueva carpeta</h2>
              <button type="button" className="rounded-full p-1 text-[var(--muted)] hover:text-[var(--text)]" onClick={() => setNewFolderOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNewFolder()}
              placeholder="Nombre de la carpeta"
              className="mb-4 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm" onClick={() => setNewFolderOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] px-4 py-2 text-sm font-semibold text-white"
                onClick={submitNewFolder}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => setShareUrl(null)}>
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold">Enlace de compartición</h2>
            <p className="mb-3 text-sm text-[var(--muted)]">Cualquiera con este enlace podrá ver el contenido.</p>
            <input readOnly value={shareUrl} className="mb-4 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-4 py-3 text-sm" />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] py-2.5 text-sm font-semibold text-white"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                Copiar enlace
              </button>
              <button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm" onClick={() => setShareUrl(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FileCard({
  item,
  selected,
  onToggleSelect,
  onContextMenu,
  onDelete,
  onDownload,
  onRename,
  onShare,
}: {
  item: DriveItem;
  selected: boolean;
  onToggleSelect: (multi: boolean) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onDownload: () => void;
  onRename?: () => void;
  onShare?: () => void;
}) {
  const Icon = getFileIcon(item.name, item.itemType);
  const isImg = isImageItem(item.name, item.mimeType, item.itemType);
  const isFolder = item.itemType === "folder";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-item-id={item.id}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-[var(--panel)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
        selected
          ? "border-[var(--accent)] ring-2 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
          : "border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))]"
      )}
      onClick={(e) => onToggleSelect(e.ctrlKey || e.metaKey)}
      onContextMenu={onContextMenu}
    >
      <div
        className={cn(
          "flex h-32 items-center justify-center border-b border-[var(--border)] bg-[var(--panel-deep)]",
          isFolder && "bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_8%,var(--panel-deep))] to-[var(--panel-deep)]"
        )}
      >
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewItemUrl(item.id)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Icon className={cn("h-10 w-10", isFolder ? "text-[var(--accent)]" : "text-[var(--muted)]")} strokeWidth={1.25} />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="truncate font-semibold text-[var(--text)]">{item.name}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {getFileKindLabel(item.name, item.mimeType, item.itemType)} · {isFolder ? formatDate(item.addedAt) : formatSize(item.size)}
        </p>
      </div>
      <div
        className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {item.itemType === "file" && (
          <ActionBtn onClick={onDownload} label="Descargar">
            <Download className="h-3.5 w-3.5" />
          </ActionBtn>
        )}
        {onShare && (
          <ActionBtn onClick={onShare} label="Compartir">
            <Share2 className="h-3.5 w-3.5" />
          </ActionBtn>
        )}
        {onRename && (
          <ActionBtn onClick={onRename} label="Renombrar">
            <span className="text-xs">✎</span>
          </ActionBtn>
        )}
        <ActionBtn onClick={onDelete} label="Eliminar" danger>
          <Trash2 className="h-3.5 w-3.5" />
        </ActionBtn>
      </div>
    </motion.article>
  );
}

function ActionBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-[var(--panel)] p-1.5 shadow-sm backdrop-blur transition",
        danger ? "border-red-500/30 text-red-500 hover:border-red-500" : "border-[var(--border)] hover:border-[var(--text)]"
      )}
    >
      {children}
    </button>
  );
}
