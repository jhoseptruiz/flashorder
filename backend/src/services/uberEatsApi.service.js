"use strict";

/**
 * uberEatsApi.service.js — Servicio central de comunicación con la API de Uber Eats.
 *
 * Responsabilidades:
 *  1. Autenticación OAuth 2.0 (Client Credentials) con caché de token.
 *  2. Wrapper de fetch que inyecta el Bearer token en cada petición.
 *  3. Funciones específicas: aceptar pedido, rechazar pedido, estado de tienda.
 */

// ── Configuración ─────────────────────────────────────────────────────────────
const UBER_AUTH_URL = "https://login.uber.com/oauth/v2/token";
const UBER_API_BASE = "https://api.uber.com";

const CLIENT_ID     = process.env.UBER_CLIENT_ID;
const CLIENT_SECRET = process.env.UBER_CLIENT_SECRET;
const STORE_ID      = process.env.UBER_STORE_ID;

// ── Caché de token en memoria ─────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0; // timestamp en ms

/**
 * Obtiene un Access Token OAuth 2.0 usando Client Credentials.
 * Cachea el token hasta 60 segundos antes de su expiración real.
 */
export async function getAccessToken() {
  // Si el token cacheado aún es válido, reutilizar
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("[UberAPI] UBER_CLIENT_ID o UBER_CLIENT_SECRET no configurados en .env");
  }

  console.log("[UberAPI] 🔑 Solicitando nuevo Access Token...");

  const res = await fetch(UBER_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    "client_credentials",
      scope:         "eats.order eats.store eats.store.orders.read",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[UberAPI] Error obteniendo token (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Cachear hasta 60 segundos antes de la expiración
  const expiresInMs = (data.expires_in || 3600) * 1000;
  tokenExpiresAt = Date.now() + expiresInMs - 60_000;

  console.log(`[UberAPI] ✅ Token obtenido, expira en ${data.expires_in}s`);
  return cachedToken;
}

/**
 * Wrapper de fetch autenticado contra la API de Uber.
 * Inyecta el Bearer token y reintenta una vez si recibe 401.
 *
 * @param {"GET"|"POST"|"PUT"|"DELETE"} method
 * @param {string} path — Ruta relativa (ej: "/v1/eats/store/{id}/status")
 * @param {object|null} body — Body JSON (null para GET)
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function uberApiFetch(method, path, body = null) {
  const doRequest = async (token) => {
    const options = {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
    };
    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }
    return fetch(`${UBER_API_BASE}${path}`, options);
  };

  let token = await getAccessToken();
  let res = await doRequest(token);

  // Si 401, forzar refresh del token e intentar una vez más
  if (res.status === 401) {
    console.log("[UberAPI] ⚠️ Token rechazado (401), forzando refresh...");
    cachedToken = null;
    tokenExpiresAt = 0;
    token = await getAccessToken();
    res = await doRequest(token);
  }

  // Parsear respuesta
  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    console.error(`[UberAPI] ❌ ${method} ${path} → ${res.status}`, data);
  }

  return { ok: res.ok, status: res.status, data };
}

// ── Funciones específicas de Pedidos ──────────────────────────────────────────

/**
 * Acepta un pedido de Uber Eats.
 * @param {string} externalOrderId — ID externo del pedido en Uber
 */
export async function acceptOrder(externalOrderId) {
  console.log(`[UberAPI] ✅ Aceptando pedido ${externalOrderId}...`);
  return uberApiFetch("POST", `/eats/orders/${externalOrderId}/accept_pos_order`);
}

/**
 * Rechaza un pedido de Uber Eats.
 * @param {string} externalOrderId — ID externo del pedido en Uber
 * @param {string} reason — Razón del rechazo (texto libre)
 * @param {string} code — Código de razón (STORE_CLOSED, POS_NOT_READY, POS_OFFLINE)
 */
export async function denyOrder(externalOrderId, reason = "Rechazado por el local", code = "STORE_CLOSED") {
  console.log(`[UberAPI] ❌ Rechazando pedido ${externalOrderId}...`);
  return uberApiFetch("POST", `/eats/orders/${externalOrderId}/deny_pos_order`, {
    reason: {
      explanation: reason,
      code,
    },
  });
}

// ── Funciones específicas de Tienda ──────────────────────────────────────────

/**
 * Obtiene el estado actual de la tienda en Uber Eats.
 */
export async function getStoreStatus() {
  if (!STORE_ID) throw new Error("[UberAPI] UBER_STORE_ID no configurado en .env");
  return uberApiFetch("GET", `/v1/eats/store/${STORE_ID}/status`);
}

/**
 * Cambia el estado de la tienda en Uber Eats.
 * @param {"ONLINE"|"PAUSED"} status
 * @param {string|null} pausedUntil — ISO 8601 timestamp (solo para PAUSED)
 * @param {string|null} reason — Razón del cambio (opcional)
 */
export async function setStoreStatus(status, pausedUntil = null, reason = null) {
  if (!STORE_ID) throw new Error("[UberAPI] UBER_STORE_ID no configurado en .env");

  const body = { status };
  if (status === "PAUSED" && pausedUntil) body.paused_until = pausedUntil;
  if (reason) body.reason = reason;

  console.log(`[UberAPI] 🏪 Cambiando estado de tienda a ${status}...`);
  return uberApiFetch("POST", `/v1/eats/store/${STORE_ID}/status`, body);
}

/**
 * Sube el menú completo a Uber Eats (PUT reemplaza todo el menú existente).
 * @param {object} menuPayload — Objeto JSON con la estructura { menus, categories, items, modifier_groups }
 */
export async function uploadMenu(menuPayload) {
  if (!STORE_ID) throw new Error("[UberAPI] UBER_STORE_ID no configurado en .env");

  console.log("[UberAPI] 📋 Subiendo menú a Uber Eats...");
  return uberApiFetch("PUT", `/v2/eats/stores/${STORE_ID}/menus`, menuPayload);
}

export { STORE_ID };
