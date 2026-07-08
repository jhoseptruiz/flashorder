"use strict";
import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";
import ProductVariant from "../models/ProductVariant.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import { Op } from "sequelize";
import sequelize from "../db/db.js";

const ORDER_INCLUDE = [
  {
    model: Customer,
    attributes: ["fullName", "phone", "email"],
  },
  {
    model: OrderItem,
    attributes: ["id", "quantity", "unitPrice", "productNameSnapshot", "components"],
    include: [
      {
        model: ProductVariant,
        attributes: ["variantName", "price"],
        include: [
          {
            model: Product,
            as: "product",           // ← alias definido en index.models.js
            attributes: ["name"],
          },
        ],
      },
    ],
  },
];

// ── Funciones existentes ──────────────────────────────────────────────────────

export async function getOrdersByStatus(status) {
  try {
    const orders = await CustomerOrder.findAll({
      where: { status },
      include: ORDER_INCLUDE,
      order: [["orderDate", "DESC"]],
    });
    return orders;
  } catch (error) {
    console.error("Error en getOrdersByStatus:", error);
    throw error;
  }
}

export async function getOrdersBetweenDates(startDate, endDate) {
  try {
    const orders = await CustomerOrder.findAll({
      where: {
        deliveryDate: {
          [Op.between]: [startDate, endDate],
        },
        status: ["pendiente", "en_cocina"],
      },
      include: ORDER_INCLUDE,
      order: [["deliveryDate", "ASC"]],
    });
    return orders;
  } catch (error) {
    console.error("Error en getOrdersBetweenDates:", error);
    throw error;
  }
}

export async function updateOrderStatus(orderId, newStatus, balancePaymentMethod = null) {
  try {
    const order = await CustomerOrder.findByPk(orderId);

    if (!order) {
      throw new Error("Orden no encontrada");
    }

    const validStatuses = ["pendiente_uber", "pendiente", "en_cocina", "empacado", "entregado", "rechazado", "cancelado"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Estado inválido: ${newStatus}`);
    }

    // ── Notificar a Uber Eats si el pedido viene de esa plataforma ──────────
    if (order.source === "uber_eats" && order.externalOrderId) {
      try {
        const { acceptOrder, denyOrder } = await import("./uberEatsApi.service.js");

        if (newStatus === "pendiente" && order.status === "pendiente_uber") {
          // Aceptar pedido en Uber
          const result = await acceptOrder(order.externalOrderId);
          console.log(`[Orders] Uber accept → ${result.status}`);
        } else if (newStatus === "rechazado") {
          // Rechazar pedido en Uber
          const result = await denyOrder(order.externalOrderId);
          console.log(`[Orders] Uber deny → ${result.status}`);
        }
      } catch (uberErr) {
        // No bloquear el cambio de estado local si Uber falla
        console.error("[Orders] Error notificando a Uber Eats:", uberErr.message);
      }
    }

    order.status = newStatus;
    if (balancePaymentMethod) {
      order.balancePaymentMethod = balancePaymentMethod;
    }
    await order.save();

    // Registrar ingreso de saldo en caja al entregar un pedido
    if (newStatus === "entregado") {
      const pendingAmount = Number(order.totalAmount || 0) - Number(order.depositAmount || 0);
      if (pendingAmount > 0) {
        try {
          const paymentMethodToUse = order.balancePaymentMethod || order.paymentMethod;
          // Solo ingresa a caja si es efectivo o transferencia
          if (paymentMethodToUse === "efectivo" || paymentMethodToUse === "transferencia") {
            const { getActiveSession, registerTransaction } = await import("./cashRegister.service.js");
            const session = await getActiveSession();
            if (session) {
              const methodLabel = paymentMethodToUse === "efectivo" ? "Saldo" : "Saldo Transferencia";
              await registerTransaction(
                session.id,
                "income",
                pendingAmount,
                `${methodLabel} Pedido #${orderId.substring(0, 8).toUpperCase()}`,
                orderId
              );
            }
          }
        } catch (e) {
          console.error("Error registrando saldo en caja:", e);
        }
      }
    }

    return order;
  } catch (error) {
    console.error("Error en updateOrderStatus:", error);
    throw error;
  }
}

export async function cancelOrder(orderId, reason, isRefunded, userRut) {
  try {
    const order = await CustomerOrder.findByPk(orderId);
    if (!order) throw new Error("Orden no encontrada");

    // Si la orden ya está entregada, no se puede cancelar
    if (order.status === "entregado") {
      throw new Error("No se puede cancelar una orden ya entregada");
    }

    // Notificar a Uber si aplica
    if (order.source === "uber_eats" && order.externalOrderId) {
      try {
        const { denyOrder } = await import("./uberEatsApi.service.js");
        await denyOrder(order.externalOrderId);
      } catch (err) {
        console.error("[Orders] Error notificando rechazo a Uber Eats:", err.message);
      }
    }

    order.status = "cancelado";
    order.cancellationReason = reason || "Sin motivo";
    order.isRefunded = isRefunded || false;
    await order.save();

    // Procesar devolución en caja si aplica
    if (order.isRefunded) {
      await processRefundInCashRegister(order, orderId);
    }

    return order;
  } catch (error) {
    console.error("Error en cancelOrder:", error);
    throw error;
  }
}

export async function updateCancelOrder(orderId, isRefunded, newReason) {
  try {
    const order = await CustomerOrder.findByPk(orderId);
    if (!order) throw new Error("Orden no encontrada");
    if (order.status !== "cancelado") throw new Error("La orden no está cancelada");

    // Evitar procesar doble devolución
    if (!order.isRefunded && isRefunded) {
      await processRefundInCashRegister(order, orderId);
    }

    order.isRefunded = isRefunded;
    if (newReason) {
      order.cancellationReason = newReason;
    }
    
    await order.save();
    return order;
  } catch (error) {
    console.error("Error en updateCancelOrder:", error);
    throw error;
  }
}

async function processRefundInCashRegister(order, orderId) {
  if (order.paymentMethod !== "efectivo" && order.paymentMethod !== "transferencia") {
    return; // No se saca dinero de la caja física si fue con tarjeta u otro medio
  }

  // Calculamos el monto a devolver: si hay cashReceived y no depositAmount, usamos cashReceived.
  // Pero lo estándar es devolver el dinero pagado (depositAmount o totalAmount si ya pagó todo)
  // En FlashOrder, si el status es antes de entregado, el cliente pudo haber pagado un "abono" o la totalidad por adelantado.
  const amountToRefund = Number(order.depositAmount || 0) > 0 ? Number(order.depositAmount) : Number(order.totalAmount);
  
  if (amountToRefund > 0) {
    try {
      const { getActiveSession, registerTransaction } = await import("./cashRegister.service.js");
      const session = await getActiveSession();
      if (session) {
        const methodLabel = order.paymentMethod || "Desconocido";
        await registerTransaction(
          session.id,
          "expense",
          amountToRefund,
          `Devolución (${methodLabel}) Pedido #${orderId.substring(0, 8).toUpperCase()}`,
          orderId
        );
      }
    } catch (e) {
      console.error("Error registrando devolución en caja:", e);
    }
  }
}

export async function getOrderById(orderId) {
  try {
    const order = await CustomerOrder.findByPk(orderId, {
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new Error("Orden no encontrada");
    }

    return order;
  } catch (error) {
    console.error("Error en getOrderById:", error);
    throw error;
  }
}

// ── Funciones para la vista del Empleado ──────────────────────────────────────

/** Todos los pedidos activos (excluye entregado) */
export async function getOrdersForEmployee(startDate, endDate) {
  try {
    const where = {
      status: { [Op.notIn]: ["entregado"] },
    };
    if (startDate && endDate) {
      where.deliveryDate = { [Op.between]: [startDate, endDate] };
    }
    const orders = await CustomerOrder.findAll({
      where,
      include: ORDER_INCLUDE,
      order: [["deliveryDate", "ASC"]],
    });
    return orders;
  } catch (error) {
    console.error("Error en getOrdersForEmployee:", error);
    throw error;
  }
}

/** Solo pedidos pendiente_uber (primer recuadro del empleado) */
export async function getUberPendingOrders() {
  try {
    const orders = await CustomerOrder.findAll({
      where: { status: "pendiente_uber" },
      include: ORDER_INCLUDE,
      order: [["orderDate", "ASC"]],
    });
    return orders;
  } catch (error) {
    console.error("Error en getUberPendingOrders:", error);
    throw error;
  }
}
