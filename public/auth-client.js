(function () {
  const SESSION_KEY = "eyedrive.sessionToken";

  function saveSessionToken(token) {
    if (token) sessionStorage.setItem(SESSION_KEY, String(token));
    else sessionStorage.removeItem(SESSION_KEY);
  }

  function getSessionToken() {
    return sessionStorage.getItem(SESSION_KEY) || "";
  }

  function authHeaders(extra) {
    const headers = { ...(extra || {}) };
    const token = getSessionToken();
    if (token) headers["X-Session-Token"] = token;
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

  function applySessionFromResponse(data) {
    if (data && data.sessionToken) saveSessionToken(data.sessionToken);
  }

  window.EyeAuth = {
    saveSessionToken,
    getSessionToken,
    clearSessionToken: () => saveSessionToken(""),
    authHeaders,
    fetchOpts,
    fetchJsonOpts,
    applySessionFromResponse,
  };
})();
