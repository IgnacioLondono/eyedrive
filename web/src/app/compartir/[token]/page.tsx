"use client";

import { motion } from "framer-motion";
import { ChevronRight, Download, HardDrive, Moon, Search, Sun } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EyeBrand } from "@/components/eye-brand";
import { useTheme } from "@/components/providers/theme-provider";
import { shareDownloadUrl, shareInfo, shareListItems, sharePreviewUrl } from "@/lib/api";
import { getFileIcon, getFileKindLabel, isImageItem } from "@/lib/files";
import type { DriveItem, PathSegment } from "@/lib/types";
import { cn, formatDate, formatSize } from "@/lib/utils";

export default function CompartirPage() {
  const params = useParams();
  const token = String(params.token || "");
  const { theme, toggleTheme } = useTheme();
  const [rootName, setRootName] = useState("");
  const [rootId, setRootId] = useState<string | null>(null);
  const [path, setPath] = useState<PathSegment[]>([]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const parentId = path.length ? path[path.length - 1].id : rootId;

  const refresh = useCallback(async () => {
    try {
      const info = await shareInfo(token);
      setRootName(info.folderName);
      setRootId(info.rootId);
      const list = await shareListItems(token, parentId);
      setItems(list);
      setError("");
    } catch {
      setError("Enlace no válido o no disponible.");
    }
  }, [token, parentId]);

  useEffect(() => {
    if (token) refresh();
  }, [token, refresh]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  function openItem(item: DriveItem) {
    if (item.itemType === "folder") {
      setPath((p) => [...p, { id: item.id, name: item.name }]);
      return;
    }
    if (isImageItem(item.name, item.mimeType, item.itemType)) {
      window.open(sharePreviewUrl(token, item.id), "_blank");
      return;
    }
    window.location.assign(shareDownloadUrl(token, item));
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-center">
        <div>
          <EyeBrand />
          <p className="mt-4 text-[var(--muted)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-5 py-4">
        <EyeBrand />
        <div>
          <p className="text-xs text-[var(--muted)]">Carpeta compartida</p>
          <h1 className="font-bold">{rootName || "Eyedrive"}</h1>
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] py-2 pl-9 pr-3 text-sm outline-none" />
        </div>
        <button type="button" onClick={toggleTheme} className="rounded-xl border border-[var(--border)] p-2">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>
      <nav className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] px-5 py-2 text-sm">
        <button type="button" className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1" onClick={() => setPath([])}>
          <HardDrive className="h-3.5 w-3.5" /> {rootName}
        </button>
        {path.map((seg, i) => (
          <span key={seg.id} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
            <button type="button" className={cn("rounded-lg border px-2 py-1", i === path.length - 1 && "border-2 border-[var(--text)] font-bold")} onClick={() => setPath(path.slice(0, i + 1))}>
              {seg.name}
            </button>
          </span>
        ))}
      </nav>
      <main className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 p-5">
        {visible.map((item) => {
          const Icon = getFileIcon(item.name, item.itemType);
          const isImg = isImageItem(item.name, item.mimeType, item.itemType);
          return (
            <motion.button
              key={item.id}
              type="button"
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 text-left hover:border-[var(--text)]"
              onClick={() => openItem(item)}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel-deep)]">
                {isImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sharePreviewUrl(token, item.id)} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <Icon className="h-5 w-5 text-[var(--muted)]" strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {getFileKindLabel(item.name, item.mimeType, item.itemType)}
                  {item.itemType === "file" && ` · ${formatSize(item.size)}`}
                </p>
              </div>
              {item.itemType === "file" && <Download className="ml-auto h-4 w-4 shrink-0 text-[var(--muted)]" />}
            </motion.button>
          );
        })}
      </main>
    </div>
  );
}
