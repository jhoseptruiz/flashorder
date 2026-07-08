/**
 * apiFetch — wrapper de fetch para peticiones autenticadas.
 *
 * Flujo:
 *  1. ANTES de cada petición, obtiene el accessToken de localStorage.
 *  2. Intenta la petición con el accessToken.
 *  3. Si el servidor responde 401 (token expirado o inválido),
 *     limpia el localStorage y dispara el evento "auth:logout" para que
 *     AuthContext cierre la sesión y redirija al login.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/** Obtiene el accessToken actual del localStorage */
function getAccessToken() {
  return localStorage.getItem("accessToken");
}

/** Limpia la sesión local y notifica a AuthContext */
function clearSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth:logout"));
}

/**
 * Realiza un fetch autenticado.
 *
 * @param {string} path        - Ruta relativa, ej. "/api/orders/employee/active"
 * @param {RequestInit} options - Opciones de fetch (method, body, headers, etc.)
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const token = getAccessToken();

  // Construir headers con el token actual
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Primera petición
  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Si no es 401, devuelve la respuesta directamente
  if (res.status !== 401) return res;

  // ── 401: el token expiró o fue revocado en base de datos ─────────────
  clearSession();
  
  return res;
}

export { API_URL };
