/**
 * apiFetch — wrapper de fetch con refresh automático de token.
 *
 * Flujo:
 *  1. Intenta la petición con el accessToken actual.
 *  2. Si el servidor responde 401, llama a POST /api/auth/refresh (usando
 *     la cookie httpOnly que el servidor ya setea).
 *  3. Si el refresh es exitoso, actualiza el accessToken en localStorage
 *     y reintenta la petición original UNA sola vez.
 *  4. Si el refresh también falla (token expirado / usuario desactivado),
 *     limpia el localStorage y dispara el evento "auth:logout" para que
 *     AuthContext cierre la sesión y redirija al login.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Obtiene el accessToken actual del localStorage */
function getAccessToken() {
  return localStorage.getItem("accessToken");
}

/** Guarda un nuevo accessToken */
function setAccessToken(token) {
  localStorage.setItem("accessToken", token);
}

/** Limpia la sesión local y notifica a AuthContext */
function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth:logout"));
}

let refreshPromise = null;

/** Intenta refrescar el accessToken usando la cookie httpOnly del servidor */
async function tryRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method:      "POST",
        credentials: "include", // envía la cookie refreshToken
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Realiza un fetch autenticado con reintentos de refresh.
 *
 * @param {string} path        - Ruta relativa, ej. "/api/orders/employee/active"
 * @param {RequestInit} options - Opciones de fetch (method, body, headers, etc.)
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  // Construir headers con el token actual
  const buildHeaders = (token) => ({
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  // Primera petición
  let token = getAccessToken();
  let res = await fetch(url, {
    ...options,
    credentials: "include",          // necesario para que el servidor reciba la cookie
    headers:     buildHeaders(token),
  });

  // Si no es 401, devuelve la respuesta directamente
  if (res.status !== 401) return res;

  // ── 401: intentar refresh ──────────────────────────────────────────────────
  const newToken = await tryRefresh();

  if (!newToken) {
    // Refresh falló → cerrar sesión
    clearSession();
    return res; // devuelve la 401 original para que el llamador la maneje
  }

  // Reintentar con el nuevo token
  res = await fetch(url, {
    ...options,
    credentials: "include",
    headers:     buildHeaders(newToken),
  });

  // Si sigue siendo 401 (p.ej. ruta prohibida por rol), no hace nada más
  return res;
}

export { API_URL };
