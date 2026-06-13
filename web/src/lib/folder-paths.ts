export interface FolderRow {
  id: string;
  name: string;
  parentId: string | null;
}

export function buildFolderPathMap(folders: FolderRow[]) {
  const byId = new Map<string, FolderRow>();
  folders.forEach((f) => byId.set(String(f.id), { ...f, id: String(f.id), parentId: f.parentId == null ? null : String(f.parentId) }));

  const cache = new Map<string, string>();
  const pathOf = (id: string): string => {
    if (cache.has(id)) return cache.get(id)!;
    const node = byId.get(id);
    if (!node) return "Mi unidad / ?";
    const p =
      node.parentId && byId.has(node.parentId)
        ? `${pathOf(node.parentId)} / ${node.name}`
        : `Mi unidad / ${node.name}`;
    cache.set(id, p);
    return p;
  };

  const pathMap = new Map<string, string>();
  byId.forEach((_, id) => pathMap.set(id, pathOf(id)));
  return { byId, pathMap };
}

export function currentPathLabel(path: { name: string }[]): string {
  if (!path.length) return "Mi unidad";
  return `Mi unidad / ${path.map((s) => s.name).join(" / ")}`;
}
