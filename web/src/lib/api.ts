import { authFetch, authGetUrl, authJsonBody, authJsonFetch, getDeviceId } from "./auth";
import { normalizeFlatTree, type FlatTreeItem } from "./tree";
import type { DriveItem, TreeNode, TrustedDevice, User } from "./types";

async function parseError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error || fallback);
}

export async function fetchMe(): Promise<User | null> {
  const res = await authFetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) await parseError(res, "No autenticado");
  return res.json();
}

export async function listItems(parentId: string | null): Promise<DriveItem[]> {
  const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
  const res = await authFetch(`/api/items${q}`);
  if (res.status === 401) throw new Error("No autenticado");
  if (!res.ok) await parseError(res, "Error al listar");
  return res.json();
}

export async function fetchItemTree(): Promise<FlatTreeItem[]> {
  const res = await authFetch("/api/items/tree");
  if (!res.ok) await parseError(res, "Error al cargar árbol");
  const data = await res.json();
  return normalizeFlatTree(Array.isArray(data) ? data : []);
}

export async function fetchFolderTree(): Promise<TreeNode[]> {
  const res = await authFetch("/api/folders/tree");
  if (!res.ok) await parseError(res, "Error al cargar carpetas");
  return res.json();
}

export async function createFolder(name: string, parentId: string | null): Promise<void> {
  const res = await authJsonFetch("/api/folders", {
    method: "POST",
    body: JSON.stringify({ name, parentId }),
  });
  if (!res.ok) await parseError(res, "No se pudo crear la carpeta");
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const res = await authJsonFetch(`/api/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) await parseError(res, "No se pudo renombrar");
}

export async function deleteItem(id: string): Promise<void> {
  const res = await authFetch(`/api/items/${id}`, { method: "DELETE" });
  if (!res.ok) await parseError(res, "No se pudo eliminar");
}

export async function moveItems(itemIds: string[], targetParentId: string | null): Promise<void> {
  const res = await authJsonFetch("/api/items/move", {
    method: "POST",
    body: JSON.stringify({ itemIds, targetParentId }),
  });
  if (!res.ok) await parseError(res, "No se pudo mover");
}

export async function createShare(folderId: string): Promise<string> {
  const res = await authJsonFetch("/api/shares", {
    method: "POST",
    body: JSON.stringify({ folderId }),
  });
  if (!res.ok) await parseError(res, "No se pudo compartir");
  const data = (await res.json()) as { path: string };
  return `${window.location.origin}${data.path}`;
}

export function downloadItemUrl(item: DriveItem): string {
  if (item.itemType === "folder") return authGetUrl(`/api/items/${item.id}/download`);
  return authGetUrl(`/api/files/${item.id}/download`);
}

export function previewItemUrl(id: string): string {
  return authGetUrl(`/api/files/${id}/preview`);
}

export async function uploadFiles(
  files: File[],
  parentId: string | null,
  relativePaths?: string[],
  onProgress?: (pct: number) => void
): Promise<void> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  if (parentId) form.append("parentId", parentId);
  if (relativePaths) relativePaths.forEach((p) => form.append("relativePaths", p));

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.withCredentials = true;
    const token = typeof window !== "undefined" ? sessionStorage.getItem("eyedrive.sessionToken") : "";
    if (token) xhr.setRequestHeader("X-Session-Token", token);
    xhr.setRequestHeader("X-Device-Id", getDeviceId());
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.error || "Error al subir"));
        } catch {
          reject(new Error("Error al subir"));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Error de red"));
    xhr.send(form);
  });
}

// Auth API helpers
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await authJsonFetch("/api/auth/login", {
      method: "POST",
      body: authJsonBody({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");
    return data;
  },
  loginConfirm: async (email: string, code: string) => {
    const res = await authJsonFetch("/api/auth/login/confirm", {
      method: "POST",
      body: authJsonBody({ email, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Código incorrecto");
    return data;
  },
  loginResend: async (email: string) => {
    const res = await authJsonFetch("/api/auth/login/resend", {
      method: "POST",
      body: authJsonBody({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo reenviar");
    return data;
  },
  registerRequest: async (payload: Record<string, string>) => {
    const res = await authJsonFetch("/api/auth/register/request", {
      method: "POST",
      body: authJsonBody(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error al registrar");
    return data;
  },
  registerConfirm: async (email: string, code: string) => {
    const res = await authJsonFetch("/api/auth/register/confirm", {
      method: "POST",
      body: authJsonBody({ email, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Código incorrecto");
    return data;
  },
  registerResend: async (email: string) => {
    const res = await authJsonFetch("/api/auth/register/resend", {
      method: "POST",
      body: authJsonBody({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo reenviar");
    return data;
  },
  passwordRequest: async (email: string) => {
    const res = await authJsonFetch("/api/auth/password/request", {
      method: "POST",
      body: authJsonBody({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error");
    return data;
  },
  passwordConfirm: async (payload: Record<string, string>) => {
    const res = await authJsonFetch("/api/auth/password/confirm", {
      method: "POST",
      body: authJsonBody(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error");
    return data;
  },
  passwordResend: async (email: string) => {
    const res = await authJsonFetch("/api/auth/password/resend", {
      method: "POST",
      body: authJsonBody({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo reenviar");
    return data;
  },
  logout: () => authJsonFetch("/api/auth/logout", { method: "POST" }),
  logoutAll: () => authFetch("/api/auth/sessions", { method: "DELETE" }),
  updateProfile: (displayName: string) =>
    authJsonFetch("/api/auth/account", { method: "PATCH", body: JSON.stringify({ displayName }) }),
  updatePassword: (payload: Record<string, string>) =>
    authJsonFetch("/api/auth/account/password", { method: "PATCH", body: JSON.stringify(payload) }),
  updateSecurity: (loginCodeEnabled: boolean) =>
    authJsonFetch("/api/auth/account/security", {
      method: "PATCH",
      body: JSON.stringify({ loginCodeEnabled }),
    }),
  listDevices: async (): Promise<TrustedDevice[]> => {
    const q = `?deviceId=${encodeURIComponent(getDeviceId())}`;
    const res = await authFetch(`/api/auth/account/devices${q}`);
    if (!res.ok) await parseError(res, "Error");
    const data = (await res.json()) as { devices?: Array<Record<string, unknown>> };
    const rows = Array.isArray(data?.devices) ? data.devices : [];
    return rows.map((d) => ({
      id: String(d.id),
      label: String(d.label || "Navegador web"),
      createdAt: String(d.createdAt || d.created_at || ""),
      lastUsedAt: String(d.lastUsedAt || d.last_used_at || ""),
      isCurrent: Boolean(d.isCurrent ?? d.is_current),
    }));
  },
  revokeAllDevices: () => authFetch("/api/auth/account/devices", { method: "DELETE" }),
};

// Share public API
export async function shareInfo(token: string) {
  const res = await fetch(`/api/share/${token}/info`);
  if (!res.ok) throw new Error("Enlace no válido");
  return res.json() as Promise<{ rootId: string; folderName: string }>;
}

export async function shareListItems(token: string, parentId: string | null) {
  const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
  const res = await fetch(`/api/share/${token}/items${q}`);
  if (!res.ok) throw new Error("No disponible");
  return res.json() as Promise<DriveItem[]>;
}

export function shareDownloadUrl(token: string, item: DriveItem): string {
  if (item.itemType === "folder") return `/api/share/${token}/item/${item.id}/download`;
  return `/api/share/${token}/file/${item.id}/download`;
}

export function sharePreviewUrl(token: string, id: string): string {
  return `/api/share/${token}/file/${id}/preview`;
}
