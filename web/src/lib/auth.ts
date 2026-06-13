"use client";

const SESSION_KEY = "eyedrive.sessionToken";
const DEVICE_KEY = "eyedrive.deviceId";

export function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SESSION_KEY) || "";
}

export function saveSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(SESSION_KEY, String(token));
  else sessionStorage.removeItem(SESSION_KEY);
}

export function clearSessionToken(): void {
  saveSessionToken("");
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = getSessionToken();
  if (token) headers.set("X-Session-Token", token);
  headers.set("X-Device-Id", getDeviceId());
  return headers;
}

export function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = authHeaders(init?.headers);
  return fetch(url, { ...init, credentials: "include", headers });
}

export function authJsonFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = authHeaders(init?.headers);
  headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, credentials: "include", headers });
}

export function authJsonBody(body: Record<string, unknown>): string {
  return JSON.stringify({ ...body, deviceId: getDeviceId() });
}

export function applySessionFromResponse(data: { sessionToken?: string }): void {
  if (data?.sessionToken) saveSessionToken(data.sessionToken);
}

export function authGetUrl(pathOrUrl: string): string {
  const url = /^https?:\/\//i.test(pathOrUrl)
    ? new URL(pathOrUrl)
    : new URL(pathOrUrl, window.location.origin);
  const token = getSessionToken();
  if (token) url.searchParams.set("st", token);
  return url.toString();
}
