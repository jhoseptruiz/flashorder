"use strict";
import sequelize from "../db/db.js";
import Customer from "../models/Customer.js";
import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";
import { Category, CompositionRule, Product, ProductVariant } from "../models/index.models.js";

// ── Crear pedido desde el POS ─────────────────────────────────────────────────
export async function createOrder({
  customer,
  items,
  deliveryDate,
  depositAmount = 0,
  paymentMethod,
  notes,
  createdByRut,
}) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Validar que hay items
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("El pedido debe tener al menos un item");
    }

    // 2. Validar datos del cliente
    if (!customer || !customer.fullName || !customer.phone) {
      throw new Error("Nombre y teléfono del cliente son obligatorios");
    }

    // 3. Crear el cliente
    const newCustomer = await Customer.create(
      {
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        email: customer.email ? customer.email.trim().toLowerCase() : null,
      },
      { transaction }
    );

    // 4. Calcular total
    const totalAmount = items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    // 5. Crear la orden
    const order = await CustomerOrder.create(
      {
        customerId: newCustomer.id,
        createdByRut,
        orderDate: new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        totalAmount,
        depositAmount: depositAmount || 0,
        source: "local",
        status: "pendiente",
        notes: notes || null,
      },
      { transaction }
    );

    // 6. Crear los items del pedido
    const orderItems = items.map((item) => ({
      orderId: order.id,
      variantId: item.variantId || null,
      groupId: item.groupId || null,
      productNameSnapshot: item.productName || "Producto",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.quantity * item.unitPrice,
    }));

    await OrderItem.bulkCreate(orderItems, { transaction });

    await transaction.commit();

    // 7. Retornar la orden completa
    const fullOrder = await CustomerOrder.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          attributes: ["id", "quantity", "unitPrice", "productNameSnapshot", "subtotal", "groupId"],
        },
        {
          model: Customer,
          attributes: ["id", "fullName", "phone", "email"],
        },
      ],
    });

    return fullOrder;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ── Obtener reglas de composición para un producto compuesto ──────────────────
export async function getCompositionRules(baseCategoryId) {
  try {
    if (!baseCategoryId) {
      throw new Error("baseCategoryId es requerido");
    }

    // Buscar las reglas ordenadas por stepOrder
    const rules = await CompositionRule.findAll({
      where: { baseCategoryId },
      include: [
        {
          model: Category,
          as: "AllowedCategory",
          attributes: ["id", "name", "behavior"],
          include: [
            {
              model: Product,
              attributes: ["id", "name", "isActive"],
              where: { isActive: true },
              required: false,
              include: [
                {
                  model: ProductVariant,
                  as: "variants",
                  attributes: ["id", "variantName", "price", "isActive"],
                  where: { isActive: true },
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      order: [["stepOrder", "ASC"]],
    });

    return rules;
  } catch (error) {
    console.error("Error en getCompositionRules:", error);
    throw error;
  }
}
