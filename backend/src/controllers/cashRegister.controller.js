"use strict";
import {
  getActiveSession,
  openSession,
  closeSession,
  getSessionDetails,
} from "../services/cashRegister.service.js";

// ── Obtener sesión activa ─────────────────────────────────────────────────────
export async function getActiveSessionController(req, res) {
  try {
    const session = await getActiveSession();
    // Retornar null si no hay sesión (no es un error)
    res.json(session);
  } catch (error) {
    console.error("Error en getActiveSessionController:", error);
    res.status(500).json({ error: error.message || "Error al obtener la sesión de caja" });
  }
}

// ── Abrir caja ────────────────────────────────────────────────────────────────
export async function openSessionController(req, res) {
  try {
    const { openingCash } = req.body;
    const userRut = req.user.rut;

    if (openingCash === undefined || openingCash === null) {
      return res.status(400).json({ error: "El monto de apertura es requerido" });
    }

    const session = await openSession(userRut, parseInt(openingCash) || 0);
    res.status(201).json(session);
  } catch (error) {
    console.error("Error en openSessionController:", error);
    res.status(400).json({ error: error.message || "No se pudo abrir la caja" });
  }
}

// ── Cerrar caja ───────────────────────────────────────────────────────────────
export async function closeSessionController(req, res) {
  try {
    const { sessionId, closingCash, notes } = req.body;
    const userRut = req.user.rut;

    if (!sessionId) {
      return res.status(400).json({ error: "El ID de sesión es requerido" });
    }

    if (closingCash === undefined || closingCash === null) {
      return res.status(400).json({ error: "El monto de cierre es requerido" });
    }

    const session = await closeSession(userRut, sessionId, parseInt(closingCash), notes);
    res.json(session);
  } catch (error) {
    console.error("Error en closeSessionController:", error);
    res.status(400).json({ error: error.message || "No se pudo cerrar la caja" });
  }
}

// ── Obtener detalles de una sesión específica ────────────────────────────────
export async function getSessionDetailsController(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "El ID de sesión es requerido" });
    }

    const sessionDetails = await getSessionDetails(id);
    if (!sessionDetails) {
      return res.status(404).json({ error: "Sesión de caja no encontrada" });
    }
    res.json(sessionDetails);
  } catch (error) {
    console.error("Error en getSessionDetailsController:", error);
    res.status(500).json({ error: error.message || "Error al obtener detalles de la caja" });
  }
}
