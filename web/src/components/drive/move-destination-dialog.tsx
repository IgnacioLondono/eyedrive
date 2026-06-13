"use client";

import { fetchFolderTree } from "@/lib/api";
import { buildFolderPathMap, type FolderRow } from "@/lib/folder-paths";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type Props = {
  blockedFolderIds: Set<string>;
  onCancel: () => void;
  onConfirm: (targetParentId: string | null) => void;
};

export function MoveDestinationDialog({ blockedFolderIds, onCancel, onConfirm }: Props) {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [selected, setSelected] = useState("ROOT");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchFolderTree()
      .then((rows) => {
        const list = rows as unknown as FolderRow[];
        setFolders(
          list.map((r) => ({
            id: String(r.id),
            name: String(r.name),
            parentId: r.parentId == null ? null : String(r.parentId),
          }))
        );
      })
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  }, []);

  const options = useMemo(() => {
    const { pathMap } = buildFolderPathMap(folders);
    const root = { id: "ROOT", label: "Mi unidad (raíz)", path: "Mi unidad", depth: 0, disabled: false };
    const rest = folders
      .map((f) => {
        const rawPath = pathMap.get(f.id) || `Mi unidad / ${f.name}`;
        const depth = Math.max(0, rawPath.split("/").length - 2);
        const blocked = blockedFolderIds.has(f.id);
        return {
          id: f.id,
          label: `${"  ".repeat(depth)}${depth > 0 ? "└ " : ""}${f.name}${blocked ? " [no disponible]" : ""}`,
          path: rawPath,
          depth,
          disabled: blocked,
        };
      })
      .sort((a, b) => a.path.localeCompare(b.path, "es", { sensitivity: "base" }));
    return [root, ...rest];
  }, [folders, blockedFolderIds]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.path.toLowerCase().includes(q) || o.label.toLowerCase().includes(q));
  }, [options, filter]);

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="flex max-h-[min(32rem,90vh)] w-full max-w-md flex-col rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Mover elementos</h2>
            <p className="text-sm text-[var(--muted)]">Elige la carpeta destino</p>
          </div>
          <button type="button" className="rounded-full p-1 text-[var(--muted)] hover:text-[var(--text)]" onClick={onCancel}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-[var(--border)] px-5 py-3">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar carpeta…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-deep)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--muted)]">Cargando carpetas…</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={opt.disabled}
                onClick={() => setSelected(opt.id)}
                className={cn(
                  "mb-0.5 w-full rounded-xl px-3 py-2 text-left text-sm transition",
                  opt.disabled && "cursor-not-allowed opacity-45",
                  selected === opt.id
                    ? "bg-[color-mix(in_srgb,var(--accent)_12%,var(--panel-deep))] font-semibold text-[var(--text)]"
                    : "text-[var(--text-soft)] hover:bg-[var(--panel-deep)]"
                )}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <button type="button" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] px-4 py-2 text-sm font-semibold text-white"
            disabled={loading || (selected !== "ROOT" && blockedFolderIds.has(selected))}
            onClick={() => onConfirm(selected === "ROOT" ? null : selected)}
          >
            Mover aquí
          </button>
        </div>
      </div>
    </div>
  );
}
