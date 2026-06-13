import type { ItemType, PathSegment, TreeNode } from "./types";

export interface FlatTreeItem {
  id: string;
  parentId: string | null;
  name: string;
  itemType: ItemType;
}

export function normalizeFlatTree(rows: Array<{ id: string; parentId?: string | null; parent_id?: string | null; name: string; type?: string; itemType?: ItemType }>): FlatTreeItem[] {
  return rows.map((r) => ({
    id: String(r.id),
    parentId: r.parentId == null && r.parent_id == null ? null : String(r.parentId ?? r.parent_id ?? ""),
    name: String(r.name || ""),
    itemType: (r.itemType || r.type) === "folder" ? "folder" : "file",
  }));
}

export function sortTreeNodes(a: FlatTreeItem, b: FlatTreeItem): number {
  if (a.itemType !== b.itemType) return a.itemType === "folder" ? -1 : 1;
  return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
}

export function buildByParentMap(items: FlatTreeItem[]): Map<string, FlatTreeItem[]> {
  const byParent = new Map<string, FlatTreeItem[]>();
  for (const item of items) {
    const key = item.parentId == null ? "ROOT" : item.parentId;
    const arr = byParent.get(key) || [];
    arr.push(item);
    byParent.set(key, arr);
  }
  for (const [key, arr] of byParent) {
    arr.sort(sortTreeNodes);
    byParent.set(key, arr);
  }
  return byParent;
}

export function buildFolderById(items: FlatTreeItem[]): Map<string, FlatTreeItem> {
  const byId = new Map<string, FlatTreeItem>();
  items.filter((i) => i.itemType === "folder").forEach((f) => byId.set(f.id, f));
  return byId;
}

export function folderPathSegmentsFromId(byId: Map<string, FlatTreeItem>, targetId: string): PathSegment[] {
  const tid = String(targetId || "");
  if (!tid || !byId.has(tid)) return [];
  const chain: PathSegment[] = [];
  let cur = byId.get(tid);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    chain.push({ id: cur.id, name: cur.name });
    if (!cur.parentId) break;
    cur = byId.get(cur.parentId);
  }
  return chain.reverse();
}

export function ensureExpandedForPath(expanded: Set<string>, path: PathSegment[]): Set<string> {
  const next = new Set(expanded);
  next.add("ROOT");
  path.forEach((seg) => next.add(seg.id));
  return next;
}

/** Raíz del árbol: solo hijos directos de Mi unidad */
export function rootChildren(byParent: Map<string, FlatTreeItem[]>): FlatTreeItem[] {
  return byParent.get("ROOT") || [];
}

export function childNodes(byParent: Map<string, FlatTreeItem[]>, parentId: string): FlatTreeItem[] {
  return byParent.get(parentId) || [];
}
