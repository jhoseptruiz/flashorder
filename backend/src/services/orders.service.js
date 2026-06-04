"use strict";
import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";
import ProductVariant from "../models/ProductVariant.js";
import Product from "../models/Product.js";
import { Op } from "sequelize";
import sequelize from "../db/db.js";

// ── Include reutilizable con alias correctos ──────────────────────────────────
// ProductVariant.belongsTo(Product, { as: 'product' })  → se necesita as:'product'

const ORDER_INCLUDE = [
  {
    model: OrderItem,
    attributes: ["id", "quantity", "unitPrice", "productNameSnapshot"],
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

export async function updateOrderStatus(orderId, newStatus) {
  try {
    const order = await CustomerOrder.findByPk(orderId);

    if (!order) {
      throw new Error("Orden no encontrada");
    }

    const validStatuses = ["pendiente_uber", "pendiente", "en_cocina", "empacado", "entregado"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Estado inválido: ${newStatus}`);
    }

    order.status = newStatus;
    await order.save();

    return order;
  } catch (error) {
    console.error("Error en updateOrderStatus:", error);
    throw error;
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
