/**
 * apiFetch — wrapper de fetch con refresh automático de token.
 *
 * Flujo:
 *  1. ANTES de cada petición, revisa si el accessToken está a punto de expirar
 *     (menos de 2 minutos de vida). Si es así, lo renueva proactivamente.
 *  2. Intenta la petición con el accessToken (nuevo o existente).
 *  3. Si el servidor responde 401, llama a POST /api/auth/refresh (usando
 *     la cookie httpOnly que el servidor ya setea).
 *  4. Si el refresh es exitoso, actualiza el accessToken en localStorage
 *     y reintenta la petición original UNA sola vez.
 *  5. Si el refresh también falla (token expirado / usuario desactivado),
 *     limpia el localStorage y dispara el evento "auth:logout" para que
 *     AuthContext cierre la sesión y redirija al login.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ── Margen de seguridad: renovar si quedan menos de 2 minutos ────────────────
const REFRESH_MARGIN_MS = 2 * 60 * 1000;

// ── Intervalo de fondo: renovar cada 12 min para cubrir inactividad total ────
const BACKGROUND_REFRESH_INTERVAL_MS = 12 * 60 * 1000;

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

/**
 * Decodifica el payload de un JWT (sin verificar firma, solo lectura).
 * Retorna el objeto payload o null si falla.
 */
function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Revisa si el token actual expira dentro del margen de seguridad.
 * Retorna true si hay que renovar (o si no se puede decodificar).
 */
function isTokenExpiringSoon(token) {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  const expiresAt = payload.exp * 1000; // convertir a ms
  return Date.now() + REFRESH_MARGIN_MS >= expiresAt;
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

  // ── Renovación proactiva: si el token está por expirar, renovar ANTES ─────
  let token = getAccessToken();
  if (isTokenExpiringSoon(token)) {
    const newToken = await tryRefresh();
    if (newToken) {
      token = newToken;
    }
    // Si el refresh falla aquí, intentamos la petición de todas formas
    // con el token viejo; el 401 reactivo lo manejará abajo.
  }

  // Primera petición
  let res = await fetch(url, {
    ...options,
    credentials: "include",          // necesario para que el servidor reciba la cookie
    headers:     buildHeaders(token),
  });

  // Si no es 401, devuelve la respuesta directamente
  if (res.status !== 401) return res;

  // ── 401: intentar refresh reactivo (por si el proactivo falló) ─────────────
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

// ── Renovación automática en segundo plano ──────────────────────────────────
// Cada 12 minutos, si hay un token almacenado y está por expirar, lo renueva.
// Esto cubre el caso de un usuario que deja la app abierta sin interactuar.
let backgroundRefreshTimer = null;

function startBackgroundRefresh() {
  if (backgroundRefreshTimer) return; // ya está activo

  backgroundRefreshTimer = setInterval(async () => {
    const token = getAccessToken();
    if (!token) return; // no hay sesión, no hacer nada

    if (isTokenExpiringSoon(token)) {
      const newToken = await tryRefresh();
      if (!newToken) {
        // El refresh token también expiró → cerrar sesión limpiamente
        clearSession();
        stopBackgroundRefresh();
      }
    }
  }, BACKGROUND_REFRESH_INTERVAL_MS);
}

function stopBackgroundRefresh() {
  if (backgroundRefreshTimer) {
    clearInterval(backgroundRefreshTimer);
    backgroundRefreshTimer = null;
  }
}

// Iniciar el refresh de fondo cuando haya un token activo
if (getAccessToken()) {
  startBackgroundRefresh();
}

// Escuchar cambios de sesión para iniciar/detener el refresh de fondo
window.addEventListener("storage", (e) => {
  if (e.key === "accessToken") {
    if (e.newValue) {
      startBackgroundRefresh();
    } else {
      stopBackgroundRefresh();
    }
  }
});

// Cuando se dispara un login exitoso, activar el refresh de fondo
window.addEventListener("auth:login", () => {
  startBackgroundRefresh();
});

// Cuando se cierra la sesión, detener
window.addEventListener("auth:logout", () => {
  stopBackgroundRefresh();
});

export { API_URL };
