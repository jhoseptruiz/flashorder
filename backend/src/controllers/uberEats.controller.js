"use strict";
import {
  getStoreStatus,
  setStoreStatus,
} from "../services/uberEatsApi.service.js";
import { syncMenuToUber } from "../services/uberEatsMenu.service.js";

/**
 * GET /api/uber/store/status
 * Consulta el estado actual de la tienda en Uber Eats.
 */
export async function getStoreStatusController(req, res) {
  try {
    const result = await getStoreStatus();

    if (!result.ok) {
      return res.status(result.status).json({
        error: "Error al consultar estado de tienda en Uber Eats",
        details: result.data,
      });
    }

    return res.json(result.data);
  } catch (error) {
    console.error("[UberCtrl] Error en getStoreStatus:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/uber/store/status
 * Cambia el estado de la tienda en Uber Eats.
 * Body: { status: "ONLINE" | "PAUSED", paused_until?: "ISO8601", reason?: "..." }
 */
export async function setStoreStatusController(req, res) {
  try {
    const { status, paused_until, reason } = req.body;

    if (!status || !["ONLINE", "PAUSED"].includes(status)) {
      return res.status(400).json({ error: "Estado debe ser ONLINE o PAUSED" });
    }

    const result = await setStoreStatus(status, paused_until || null, reason || null);

    if (!result.ok) {
      return res.status(result.status).json({
        error: "Error al cambiar estado de tienda en Uber Eats",
        details: result.data,
      });
    }

    return res.json({ message: `Tienda ${status === "ONLINE" ? "activada" : "pausada"} exitosamente`, data: result.data });
  } catch (error) {
    console.error("[UberCtrl] Error en setStoreStatus:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/uber/menu/sync
 * Dispara manualmente la sincronización del menú con Uber Eats.
 */
export async function triggerMenuSyncController(req, res) {
  try {
    const result = await syncMenuToUber();

    if (!result.ok) {
      return res.status(result.status).json({
        error: "Error al sincronizar menú con Uber Eats",
        details: result.data,
      });
    }

    return res.json({ message: "Menú sincronizado exitosamente con Uber Eats" });
  } catch (error) {
    console.error("[UberCtrl] Error en triggerMenuSync:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
