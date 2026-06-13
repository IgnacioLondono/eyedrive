"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { getFileIcon } from "@/lib/files";
import {
  buildByParentMap,
  buildFolderById,
  childNodes,
  folderPathSegmentsFromId,
  type FlatTreeItem,
} from "@/lib/tree";
import type { DriveItem, PathSegment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type Props = {
  flat: FlatTreeItem[];
  path: PathSegment[];
  expanded: Set<string>;
  rootExpanded: boolean;
  onToggleRoot: () => void;
  onToggleFolder: (id: string) => void;
  onNavigateFolder: (segments: PathSegment[]) => void;
  onOpenFile: (item: DriveItem) => void;
};

export function SidebarTree({
  flat,
  path,
  expanded,
  rootExpanded,
  onToggleRoot,
  onToggleFolder,
  onNavigateFolder,
  onOpenFile,
}: Props) {
  const items = flat;
  const byParent = useMemo(() => buildByParentMap(items), [items]);
  const folderById = useMemo(() => buildFolderById(items), [items]);
  const activeId = path.length ? path[path.length - 1].id : "";

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggleRoot}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
          path.length === 0
            ? "border-white/80 bg-white/10 text-white"
            : "border-white/15 text-zinc-400 hover:border-white/35 hover:text-white"
        )}
      >
        {rootExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span>Mi unidad</span>
      </button>

      {rootExpanded && (
        <ul className="ml-1 space-y-0.5 border-l border-white/10 pl-2">
          {(byParent.get("ROOT") || []).map((node) => (
            <TreeBranch
              key={node.id}
              node={node}
              depth={0}
              byParent={byParent}
              folderById={folderById}
              expanded={expanded}
              activeId={activeId}
              onToggleFolder={onToggleFolder}
              onNavigateFolder={onNavigateFolder}
              onOpenFile={onOpenFile}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeBranch({
  node,
  depth,
  byParent,
  folderById,
  expanded,
  activeId,
  onToggleFolder,
  onNavigateFolder,
  onOpenFile,
}: {
  node: FlatTreeItem;
  depth: number;
  byParent: Map<string, FlatTreeItem[]>;
  folderById: Map<string, FlatTreeItem>;
  expanded: Set<string>;
  activeId: string;
  onToggleFolder: (id: string) => void;
  onNavigateFolder: (segments: PathSegment[]) => void;
  onOpenFile: (item: DriveItem) => void;
}) {
  const isFolder = node.itemType === "folder";
  const kids = isFolder ? childNodes(byParent, node.id) : [];
  const hasKids = kids.length > 0;
  const isOpen = expanded.has(node.id);
  const Icon = getFileIcon(node.name, node.itemType);
  const isActive = isFolder && activeId === node.id;

  return (
    <li>
      <div className="flex items-center gap-1" style={{ paddingLeft: depth * 4 }}>
        {isFolder ? (
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center text-zinc-500 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              if (hasKids) onToggleFolder(node.id);
            }}
            aria-label={hasKids ? "Expandir" : "Carpeta vacía"}
          >
            {hasKids ? (
              isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <span className="text-[10px]">•</span>
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => {
            if (isFolder) {
              onNavigateFolder(folderPathSegmentsFromId(folderById, node.id));
            } else {
              onOpenFile({ id: node.id, name: node.name, itemType: "file", size: 0, addedAt: "" });
            }
          }}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition",
            isActive
              ? "border-white/70 bg-white/10 font-semibold text-white"
              : "border-transparent text-zinc-400 hover:border-white/25 hover:text-zinc-100",
            !isFolder && "border-dashed border-white/10"
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.5} />
          <span className="truncate">{node.name}</span>
        </button>
      </div>

      {isFolder && hasKids && isOpen && (
        <ul className="mt-0.5 space-y-0.5 border-l border-white/8 pl-2">
          {kids.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              byParent={byParent}
              folderById={folderById}
              expanded={expanded}
              activeId={activeId}
              onToggleFolder={onToggleFolder}
              onNavigateFolder={onNavigateFolder}
              onOpenFile={onOpenFile}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
