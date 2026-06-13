"use client";

import { motion } from "framer-motion";
import { CloudUpload, Download, FolderPlus, LayoutGrid, Share2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DriveShell } from "@/components/drive/drive-shell";
import { SidebarTree } from "@/components/drive/sidebar-tree";
import {
  authApi,
  createFolder,
  createShare,
  deleteItem,
  downloadItemUrl,
  fetchItemTree,
  listItems,
  previewItemUrl,
  renameFolder,
  uploadFiles,
} from "@/lib/api";
import { clearSessionToken } from "@/lib/auth";
import { getFileIcon, getFileKindLabel, isImageItem } from "@/lib/files";
import { ensureExpandedForPath, type FlatTreeItem } from "@/lib/tree";
import type { DriveItem, PathSegment, User as AppUser } from "@/lib/types";
import { cn, formatDate, formatSize } from "@/lib/utils";

const NAV_KEY = "eyedrive.nav.pathSegments.v1";

function loadPath(): PathSegment[] {
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePath(segments: PathSegment[]) {
  sessionStorage.setItem(NAV_KEY, JSON.stringify(segments));
}

export function DriveApp({ user }: { user: AppUser }) {
  const router = useRouter();
  const [path, setPath] = useState<PathSegment[]>([]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [treeFlat, setTreeFlat] = useState<FlatTreeItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["ROOT"]));
  const [rootExpanded, setRootExpanded] = useState(true);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const parentId = path.length ? path[path.length - 1].id : null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, tree] = await Promise.all([listItems(parentId), fetchItemTree()]);
      setItems(list);
      setTreeFlat(tree);
    } catch (e) {
      if (e instanceof Error && e.message === "No autenticado") router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [parentId, router]);

  useEffect(() => {
    setPath(loadPath());
  }, []);

  useEffect(() => {
    savePath(path);
    setExpanded((prev) => ensureExpandedForPath(prev, path));
    refresh();
  }, [path, refresh]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  function navigate(segments: PathSegment[]) {
    setPath(segments);
    setSearch("");
  }

  function openItem(item: DriveItem) {
    if (item.itemType === "folder") {
      navigate([...path, { id: item.id, name: item.name }]);
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

  async function onDelete(item: DriveItem) {
    if (!confirm(`¿Eliminar «${item.name}»?`)) return;
    try {
      await deleteItem(item.id);
      await refresh();
    } catch {
      alert("No se pudo eliminar");
    }
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

  async function logout() {
    await authApi.logout();
    clearSessionToken();
    router.replace("/login");
  }

  const currentFolder = path.length ? path[path.length - 1] : null;

  return (
    <>
      <DriveShell
        user={user}
        path={path}
        onNavigate={navigate}
        search={search}
        onSearchChange={setSearch}
        onRefresh={refresh}
        onLogout={logout}
        sidebar={
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
            onNavigateFolder={navigate}
            onOpenFile={openItem}
          />
        }
        toolbar={
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              <CloudUpload className="h-4 w-4" /> Subir
            </button>
            <button
              type="button"
              onClick={() => setNewFolderOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium transition hover:border-[var(--text)]"
            >
              <FolderPlus className="h-4 w-4" /> Nueva carpeta
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
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm transition hover:border-[var(--text)]"
              >
                <Share2 className="h-4 w-4" /> Compartir
              </button>
            )}
            <span className="ml-auto flex items-center gap-1.5 text-sm text-[var(--muted)]">
              <LayoutGrid className="h-4 w-4" />
              {visible.length} elemento{visible.length === 1 ? "" : "s"}
            </span>
          </>
        }
      >
        {uploadPct !== null && (
          <div className="mx-6 mt-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
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

        <main
          className="flex-1 px-6 py-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onUpload(e.dataTransfer.files);
          }}
        >
          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--panel)]" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <button
              type="button"
              className="flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--panel)] py-24 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
              onClick={() => fileRef.current?.click()}
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--panel-deep)]">
                <CloudUpload className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-lg font-medium text-[var(--text)]">Esta carpeta está vacía</p>
              <p className="mt-1 text-sm">Arrastra archivos aquí o pulsa para subir</p>
            </button>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {visible.map((item) => (
                <FileCard
                  key={item.id}
                  item={item}
                  onOpen={() => openItem(item)}
                  onDelete={() => onDelete(item)}
                  onDownload={() => window.location.assign(downloadItemUrl(item))}
                  onRename={item.itemType === "folder" ? () => onRenameFolder(item) : undefined}
                  onShare={item.itemType === "folder" ? () => onShareFolder(item) : undefined}
                />
              ))}
            </div>
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
  onOpen,
  onDelete,
  onDownload,
  onRename,
  onShare,
}: {
  item: DriveItem;
  onOpen: () => void;
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
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-sm transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:shadow-lg"
      onClick={onOpen}
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
