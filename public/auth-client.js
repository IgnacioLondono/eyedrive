(function () {
  const SESSION_KEY = "eyedrive.sessionToken";
  const DEVICE_KEY = "eyedrive.deviceId";

  function saveSessionToken(token) {
    if (token) sessionStorage.setItem(SESSION_KEY, String(token));
    else sessionStorage.removeItem(SESSION_KEY);
  }

  function getSessionToken() {
    return sessionStorage.getItem(SESSION_KEY) || "";
  }

  function getDeviceId() {
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

  function authHeaders(extra) {
    const headers = { ...(extra || {}) };
    const token = getSessionToken();
    if (token) headers["X-Session-Token"] = token;
    headers["X-Device-Id"] = getDeviceId();
    return headers;
  }

  function fetchOpts(extra) {
    const base = extra || {};
    return {
      credentials: "include",
      ...base,
      headers: authHeaders(base.headers),
    };
  }

  function fetchJsonOpts(extra) {
    return fetchOpts({
      ...(extra || {}),
      headers: { "Content-Type": "application/json", ...((extra && extra.headers) || {}) },
    });
  }

  function authJsonBody(body) {
    const payload = body && typeof body === "object" ? { ...body } : {};
    if (!payload.deviceId) payload.deviceId = getDeviceId();
    return JSON.stringify(payload);
  }

  function applySessionFromResponse(data) {
    if (data && data.sessionToken) saveSessionToken(data.sessionToken);
  }

  window.EyeAuth = {
    saveSessionToken,
    getSessionToken,
    getDeviceId,
    clearSessionToken: () => saveSessionToken(""),
    authHeaders,
    fetchOpts,
    fetchJsonOpts,
    authJsonBody,
    applySessionFromResponse,
  };
})();
