"use strict";
import crypto from "crypto";
import { CustomerOrder, OrderItem, Customer, ProductVariant, Product } from "../models/index.models.js";
import { v4 as uuidv4 } from "uuid";

// ── Validación de firma HMAC ──────────────────────────────────────────────────

/**
 * Valida la firma HMAC-SHA256 enviada por Uber en el header X-Uber-Signature.
 * @param {string|Buffer} rawBody - Body crudo de la petición (string o buffer).
 * @param {string} signature - Firma recibida en el header.
 * @returns {boolean} true si la firma es válida.
 */
export function validateSignature(rawBody, signature) {
  if (!signature) return false;

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("[UberEats] WEBHOOK_SECRET no configurado en .env");
    return false;
  }

  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  // Comparación segura contra timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ── Procesamiento del pedido ──────────────────────────────────────────────────

/**
 * Procesa el payload de un webhook de Uber Eats y crea el pedido en la BD.
 * @param {object} payload - Body JSON del webhook de Uber Eats.
 */
export async function processUberOrder(payload) {
  try {
    const externalOrderId = payload.order_id || payload.id || `UBER-${Date.now()}`;

    // ── Verificar duplicados ──
    const existing = await CustomerOrder.findOne({ where: { externalOrderId } });
    if (existing) {
      console.log(`[UberEats] Pedido ${externalOrderId} ya existe, ignorando duplicado.`);
      return existing;
    }

    // ── Crear o reutilizar cliente ──
    const customerName = payload.eater?.first_name
      ? `${payload.eater.first_name} ${payload.eater.last_name || ""}`.trim()
      : "Cliente Uber Eats";
    const customerPhone = payload.eater?.phone || "0000000000";

    const [customer] = await Customer.findOrCreate({
      where: { phone: customerPhone },
      defaults: { fullName: customerName, phone: customerPhone },
    });

    // ── Procesar items y calcular total ──
    const items = payload.items || payload.cart?.items || [];
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const quantity = item.quantity || 1;
      const unitPrice = Math.round((item.price?.unit_price?.amount || item.price || 0) * 100) / 100;
      // Uber envía precios en formato decimal; nosotros usamos CLP (enteros)
      const priceCLP = Math.round(unitPrice);
      const subtotal = priceCLP * quantity;
      totalAmount += subtotal;

      // Intentar mapear con producto local por external_id
      let variantId = null;
      const externalItemId = item.id || item.external_id || null;

      if (externalItemId) {
        const localVariant = await ProductVariant.findOne({
          where: { externalId: externalItemId },
        });
        if (localVariant) {
          variantId = localVariant.id;
        }
      }

      const productName = item.title || item.name || "Producto Uber Eats";

      orderItemsData.push({
        id: uuidv4(),
        variantId,
        groupId: null,
        productNameSnapshot: productName,
        quantity,
        unitPrice: priceCLP,
        subtotal,
        externalItemId,
      });
    }

    // ── Crear el pedido ──
    const order = await CustomerOrder.create({
      customerId: customer.id,
      orderDate: new Date(),
      deliveryDate: payload.estimated_ready_for_pickup_at
        ? new Date(payload.estimated_ready_for_pickup_at)
        : null,
      totalAmount,
      depositAmount: totalAmount, // Uber cobra al cliente, el abono es total
      source: "uber_eats",
      externalOrderId,
      status: "pendiente_uber",
      companyName: "Uber Eats",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Uber_Eats_2020_logo.svg/512px-Uber_Eats_2020_logo.svg.png",
      paymentMethod: "uber_eats",
      notes: payload.special_instructions || payload.notes || null,
    });

    // ── Crear los items del pedido ──
    for (const itemData of orderItemsData) {
      await OrderItem.create({
        ...itemData,
        orderId: order.id,
      });
    }

    console.log(`[UberEats] ✅ Pedido ${externalOrderId} creado exitosamente (${orderItemsData.length} items, total: $${totalAmount})`);
    return order;
  } catch (error) {
    console.error("[UberEats] ❌ Error procesando pedido:", error);
    throw error;
  }
}
