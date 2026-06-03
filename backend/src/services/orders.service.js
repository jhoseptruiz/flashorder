import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";
import ProductVariant from "../models/ProductVariant.js";
import Product from "../models/Product.js";
import sequelize from "../db/db.js";

export async function getOrdersByStatus(status) {
  try {
    const orders = await CustomerOrder.findAll({
      where: { status },
      include: [
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
                  attributes: ["name"],
                },
              ],
            },
          ],
        },
      ],
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
          [sequelize.Sequelize.Op.between]: [startDate, endDate],
        },
        status: ["pendiente", "en_cocina"],
      },
      include: [
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
                  attributes: ["name"],
                },
              ],
            },
          ],
        },
      ],
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

    const validStatuses = ["pendiente", "en_cocina", "empacado", "entregado"];
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
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: ProductVariant,
              attributes: ["variantName", "price"],
              include: [
                {
                  model: Product,
                  attributes: ["name", "price"],
                },
              ],
            },
          ],
        },
      ],
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
