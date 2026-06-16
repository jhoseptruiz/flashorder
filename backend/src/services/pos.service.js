"use strict";
import sequelize from "../db/db.js";
import Customer from "../models/Customer.js";
import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";
import { Category, CompositionRule, Product, ProductVariant } from "../models/index.models.js";
import { sendReceiptEmail } from "./email.service.js";
import { getActiveSession, registerTransaction } from "./cashRegister.service.js";

// ── Crear pedido desde el POS ─────────────────────────────────────────────────
export async function createOrder({
  customer,
  items,
  deliveryDate,
  depositAmount = 0,
  paymentMethod,
  notes,
  companyName,
  companyLogo,
  createdByRut,
  cashReceived = 0,
  cashChange = 0,
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

    // Calcular montos de efectivo finales
    let finalCashReceived = 0;
    let finalCashChange = 0;
    if (paymentMethod === "efectivo") {
      const dep = depositAmount || 0;
      const rec = cashReceived || 0;
      if (rec <= 0 || rec < dep) {
        finalCashReceived = dep;
        finalCashChange = 0;
      } else {
        finalCashReceived = rec;
        finalCashChange = rec - dep;
      }
    }

    // 5. Buscar sesión de caja activa (si es efectivo, es obligatoria)
    let activeSession = null;
    try {
      activeSession = await getActiveSession();
    } catch (e) {
      // Si falla, no bloquear
    }

    if (paymentMethod === "efectivo" && !activeSession) {
      throw new Error("Debes abrir la caja antes de registrar un pedido con pago en efectivo.");
    }

    // 6. Crear la orden
    const order = await CustomerOrder.create(
      {
        customerId: newCustomer.id,
        createdByRut,
        orderDate: new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        totalAmount,
        depositAmount: depositAmount || 0,
        paymentMethod: paymentMethod || null,
        companyName: companyName || null,
        companyLogo: companyLogo || null,
        source: "local",
        status: "pendiente",
        notes: notes || null,
        cashReceived: finalCashReceived,
        cashChange: finalCashChange,
        cashRegisterSessionId: activeSession ? activeSession.id : null,
      },
      { transaction }
    );

    // 7. Crear los items del pedido
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

    // 8. Registrar transacción de caja (ingreso del abono / pago)
    if (activeSession && depositAmount > 0) {
      try {
        const transAmount = paymentMethod === "efectivo" ? finalCashReceived : depositAmount;
        const methodLabel = paymentMethod === "efectivo" ? "Abono" : paymentMethod === "transferencia" ? "Transferencia" : "Tarjeta";
        await registerTransaction(
          activeSession.id,
          "income",
          transAmount,
          `${methodLabel} Pedido #${order.id.substring(0, 8).toUpperCase()}`,
          order.id
        );
      } catch (e) {
        console.error("Error registrando transacción de caja:", e);
      }
    }

    // 8b. Registrar egreso de vuelto en caja
    if (paymentMethod === "efectivo" && activeSession && finalCashChange > 0) {
      try {
        await registerTransaction(
          activeSession.id,
          "expense",
          finalCashChange,
          `Vuelto Pedido #${order.id.substring(0, 8).toUpperCase()}`,
          order.id
        );
      } catch (e) {
        console.error("Error registrando vuelto en caja:", e);
      }
    }

    // Enviar boleta por correo sin bloquear la respuesta
    void sendReceiptEmail({
      ...order.get({ plain: true }),
      Customer: newCustomer.get({ plain: true }),
      OrderItems: orderItems.map((item, index) => ({
        ...item,
        id: index.toString(),
        subtotal: item.subtotal,
      })),
    }, { companyName, companyLogo }).catch((error) => {
      console.error("Error al enviar boleta por correo:", error);
    });

    // 9. Retornar la orden completa
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
export async function getCompositionRules(baseCategoryId, independentCategoryId) {
  try {
    if (!baseCategoryId) {
      throw new Error("baseCategoryId es requerido");
    }

    // Estrategia: Buscar las categorías base/complemento cuyos productos
    // están relacionados con la categoría independiente del producto compuesto.
    // Luego usar minItems/maxItems de cada categoría.

    // 1. Buscar categorías de tipo base o complemento que tengan productos
    //    con relatedCategoryId apuntando a la categoría independiente
    const whereProduct = { isActive: true };
    if (independentCategoryId) {
      whereProduct.relatedCategoryId = independentCategoryId;
    }

    const categories = await Category.findAll({
      where: {
        behavior: ["base", "complemento"],
        isActive: true,
      },
      include: [
        {
          model: Product,
          attributes: ["id", "name", "isActive", "relatedCategoryId"],
          where: whereProduct,
          required: true,
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
      order: [["displayOrder", "ASC"]],
    });

    // 2. Transformar los resultados al formato esperado por el frontend
    //    (compatible con la estructura anterior de CompositionRule)
    const rules = categories.map((cat, index) => ({
      id: cat.id,
      minItems: cat.minItems,
      maxItems: cat.maxItems,
      stepOrder: index + 1,
      AllowedCategory: {
        id: cat.id,
        name: cat.name,
        behavior: cat.behavior,
        Products: cat.Products,
      },
    }));

    return rules;
  } catch (error) {
    console.error("Error en getCompositionRules:", error);
    throw error;
  }
}
