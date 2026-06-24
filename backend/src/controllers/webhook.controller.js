"use strict";
import { validateSignature, processUberOrder } from "../services/uberEats.service.js";

/**
 * Recibe el webhook de Uber Eats.
 * 1. Valida la firma HMAC del header.
 * 2. Responde 200 OK inmediatamente (requisito de Uber: < 5 segundos).
 * 3. Procesa el pedido de forma asíncrona.
 */
export async function receiveUberOrder(req, res) {
  try {
    // ── Validar firma ──
    const signature = req.headers["x-uber-signature"];
    const rawBody = JSON.stringify(req.body);

    if (!validateSignature(rawBody, signature)) {
      console.warn("[Webhook] ⚠️ Firma HMAC inválida, rechazando petición.");
      return res.status(401).json({ error: "Firma inválida" });
    }

    // ── Responder rápido a Uber (requisito) ──
    res.status(200).json({ status: "received" });

    // ── Procesar pedido de forma asíncrona ──
    const payload = req.body;
    console.log(`[Webhook] 📥 Webhook recibido de Uber Eats — event: ${payload.event_type || "order"}, order_id: ${payload.order_id || payload.id || "N/A"}`);

    await processUberOrder(payload);
  } catch (error) {
    console.error("[Webhook] ❌ Error en receiveUberOrder:", error);
    // Si ya respondimos 200, no podemos enviar otro status
    if (!res.headersSent) {
      res.status(500).json({ error: "Error interno procesando webhook" });
    }
  }
}
