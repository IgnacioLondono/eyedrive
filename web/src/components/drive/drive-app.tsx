"use client";

import { motion } from "framer-motion";
import {
  ChevronRight,
  CloudUpload,
  Download,
  FolderPlus,
  HardDrive,
  Moon,
  RefreshCw,
  Search,
  Share2,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EyeBrand } from "@/components/eye-brand";
import { useTheme } from "@/components/providers/theme-provider";
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
import type { DriveItem, PathSegment, TreeNode, User as AppUser } from "@/lib/types";
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
  const { theme, toggleTheme } = useTheme();
  const [path, setPath] = useState<PathSegment[]>([]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parentId = path.length ? path[path.length - 1].id : null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, t] = await Promise.all([listItems(parentId), fetchItemTree()]);
      setItems(list);
      setTree(t);
      setSelected(new Set());
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

  async function onNewFolder() {
    const name = prompt("Nombre de la carpeta");
    if (!name?.trim()) return;
    try {
      await createFolder(name.trim(), parentId);
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

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] text-[var(--sidebar-text)]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <EyeBrand size={36} />
          <span className="text-lg font-bold">Eyedrive</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <button
            type="button"
            onClick={() => navigate([])}
            className={cn(
              "mb-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
              path.length === 0 ? "border-white font-bold" : "border-white/20 text-[var(--sidebar-muted)] hover:border-white/50"
            )}
          >
            <HardDrive className="h-4 w-4" /> Mi unidad
          </button>
          <TreeView nodes={tree} path={path} expanded={expanded} setExpanded={setExpanded} onNavigate={navigate} onOpenFile={openItem} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-5 py-3">
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <button type="button" className="rounded-lg border border-[var(--border)] px-2 py-1 hover:border-[var(--text)]" onClick={() => navigate([])}>
              Mi unidad
            </button>
            {path.map((seg, i) => (
              <span key={seg.id} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                <button
                  type="button"
                  className={cn(
                    "rounded-lg border px-2 py-1",
                    i === path.length - 1 ? "border-2 border-[var(--text)] font-bold" : "border-[var(--border)] hover:border-[var(--text)]"
                  )}
                  onClick={() => navigate(path.slice(0, i + 1))}
                >
                  {seg.name}
                </button>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en esta carpeta…"
                className="rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--text)]"
              />
            </div>
            <button type="button" onClick={() => refresh()} className="rounded-xl border border-[var(--border)] p-2 hover:border-[var(--text)]" aria-label="Actualizar">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button type="button" onClick={toggleTheme} className="rounded-xl border border-[var(--border)] p-2 hover:border-[var(--text)]" aria-label="Tema">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--text)]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--text)] text-xs font-bold text-[var(--bg)]">
                  {(user.displayName || user.email).slice(0, 2).toUpperCase()}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--panel)] py-1 shadow-xl">
                  <p className="truncate px-3 py-2 text-xs text-[var(--muted)]">{user.email}</p>
                  <Link href="/cuenta" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--panel-deep)]"><User className="h-4 w-4" /> Mi cuenta</Link>
                  <button type="button" onClick={logout} className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--panel-deep)]">Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-5 py-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--text)] px-3 py-2 text-sm font-medium text-[var(--bg)]">
            <CloudUpload className="h-4 w-4" /> Subir
          </button>
          <button type="button" onClick={onNewFolder} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--text)]">
            <FolderPlus className="h-4 w-4" /> Nueva carpeta
          </button>
          {path.length > 0 && (
            <button
              type="button"
              onClick={() => onShareFolder({ id: path[path.length - 1].id, name: path[path.length - 1].name, itemType: "folder", size: 0, addedAt: "" })}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--text)]"
            >
              <Share2 className="h-4 w-4" /> Compartir carpeta
            </button>
          )}
          <span className="ml-auto self-center text-sm text-[var(--muted)]">{visible.length} elemento{visible.length === 1 ? "" : "s"}</span>
        </div>

        {uploadPct !== null && (
          <div className="mx-5 mt-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
            <div className="mb-1 text-sm">Subiendo… {uploadPct}%</div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-deep)]">
              <motion.div className="h-full bg-[var(--text)]" animate={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        )}

        <main
          className="flex-1 p-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onUpload(e.dataTransfer.files); }}
        >
          {loading ? (
            <p className="text-[var(--muted)]">Cargando…</p>
          ) : visible.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-20 text-[var(--muted)]"
              onClick={() => fileRef.current?.click()}
            >
              <CloudUpload className="mb-3 h-10 w-10 opacity-40" />
              <p>Arrastra archivos aquí o pulsa para subir</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {visible.map((item) => (
                <FileCard
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
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
      </div>

      <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />

      {shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShareUrl(null)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-semibold">Enlace de compartición</h2>
            <input readOnly value={shareUrl} className="mb-3 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button type="button" className="flex-1 rounded-xl bg-[var(--text)] py-2 text-sm font-medium text-[var(--bg)]" onClick={() => navigator.clipboard.writeText(shareUrl)}>
                Copiar enlace
              </button>
              <button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm" onClick={() => setShareUrl(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileCard({
  item,
  selected,
  onOpen,
  onDelete,
  onDownload,
  onRename,
  onShare,
}: {
  item: DriveItem;
  selected: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onRename?: () => void;
  onShare?: () => void;
}) {
  const Icon = getFileIcon(item.name, item.itemType);
  const isImg = isImageItem(item.name, item.mimeType, item.itemType);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex cursor-pointer gap-3 rounded-2xl border bg-[var(--panel)] p-3 transition hover:shadow-lg hover:shadow-black/5",
        selected ? "border-2 border-[var(--text)]" : "border-[var(--border)]"
      )}
      onClick={onOpen}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel-deep)]">
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewItemUrl(item.id)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Icon className="h-5 w-5 text-[var(--muted)]" strokeWidth={1.5} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[var(--text)]">{item.name}</p>
        <p className="text-xs text-[var(--muted)]">
          {getFileKindLabel(item.name, item.mimeType, item.itemType)} · {item.itemType === "folder" ? formatDate(item.addedAt) : formatSize(item.size)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 opacity-0 transition group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        {item.itemType === "file" && (
          <button type="button" className="rounded-lg border border-[var(--border)] p-1 hover:border-[var(--text)]" onClick={onDownload} aria-label="Descargar">
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
        {onShare && (
          <button type="button" className="rounded-lg border border-[var(--border)] p-1 hover:border-[var(--text)]" onClick={onShare} aria-label="Compartir">
            <Share2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onRename && (
          <button type="button" className="rounded-lg border border-[var(--border)] p-1 text-xs hover:border-[var(--text)]" onClick={onRename}>✎</button>
        )}
        <button type="button" className="rounded-lg border border-red-500/30 p-1 text-red-500 hover:border-red-500" onClick={onDelete} aria-label="Eliminar">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

function TreeView({
  nodes,
  path,
  expanded,
  setExpanded,
  onNavigate,
  onOpenFile,
  depth = 0,
}: {
  nodes: TreeNode[];
  path: PathSegment[];
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  onNavigate: (segments: PathSegment[]) => void;
  onOpenFile: (item: DriveItem) => void;
  depth?: number;
}) {
  return (
    <ul className="space-y-0.5" style={{ paddingLeft: depth ? 12 : 0 }}>
      {nodes.map((node) => {
        const isFolder = node.itemType === "folder";
        const hasKids = isFolder && (node.children?.length ?? 0) > 0;
        const isOpen = expanded.has(node.id);
        const Icon = getFileIcon(node.name, node.itemType);
        return (
          <li key={node.id}>
            <div className="flex items-center gap-0.5">
              {isFolder && (
                <button
                  type="button"
                  className="w-4 text-xs text-[var(--sidebar-muted)]"
                  onClick={() => setExpanded((s) => {
                    const n = new Set(s);
                    if (n.has(node.id)) n.delete(node.id);
                    else n.add(node.id);
                    return n;
                  })}
                >
                  {hasKids ? (isOpen ? "▾" : "▸") : "•"}
                </button>
              )}
              {!isFolder && <span className="w-4" />}
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-left text-xs text-[var(--sidebar-muted)] hover:border-white/40 hover:text-[var(--sidebar-text)]"
                onClick={() => {
                  if (isFolder) {
                    // build path from tree is complex; navigate by name/id from root is handled in main grid
                    onNavigate([{ id: node.id, name: node.name }]);
                  } else {
                    onOpenFile({ id: node.id, name: node.name, itemType: "file", size: 0, addedAt: "" });
                  }
                }}
              >
                <Icon className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.5} />
                <span className="truncate">{node.name}</span>
              </button>
            </div>
            {isFolder && hasKids && isOpen && (
              <TreeView nodes={node.children!} path={path} expanded={expanded} setExpanded={setExpanded} onNavigate={onNavigate} onOpenFile={onOpenFile} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
