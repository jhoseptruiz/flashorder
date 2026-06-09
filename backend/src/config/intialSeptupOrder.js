"use strict";
import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";

export async function createInitialOrders() {
  try {
    // Datos de órdenes de prueba
    const SAMPLE_ORDERS = [
      {
        orderDate: new Date("2026-06-02T10:30:00"),
        deliveryDate: new Date("2026-06-02T14:00:00"),
        totalAmount: 25000,
        source: "local",
        status: "pendiente",
        notes: "Sin pimienta",
        items: [
          {
            productNameSnapshot: "X1 Torta Chocolate",
            quantity: 1,
            unitPrice: 25000,
            subtotal: 25000,
          },
        ],
      },
      {
        orderDate: new Date("2026-06-02T11:15:00"),
        deliveryDate: new Date("2026-06-02T14:30:00"),
        totalAmount: 18500,
        source: "local",
        status: "pendiente",
        notes: "Extra queso",
        items: [
          {
            productNameSnapshot: "X2 Docena Calzones",
            quantity: 2,
            unitPrice: 9250,
            subtotal: 18500,
          },
        ],
      },
      {
        orderDate: new Date("2026-06-02T11:45:00"),
        deliveryDate: new Date("2026-06-02T15:00:00"),
        totalAmount: 32000,
        source: "uber_eats",
        externalOrderId: "UBER-001",
        status: "pendiente",
        notes: null,
        items: [
          {
            productNameSnapshot: "X1 Pizza Especial",
            quantity: 1,
            unitPrice: 32000,
            subtotal: 32000,
          },
        ],
      },
      {
        orderDate: new Date("2026-06-02T12:20:00"),
        deliveryDate: new Date("2026-06-02T15:30:00"),
        totalAmount: 21500,
        source: "local",
        status: "pendiente",
        notes: "Sin gluten",
        items: [
          {
            productNameSnapshot: "X1 Torta Vainilla (sin gluten)",
            quantity: 1,
            unitPrice: 21500,
            subtotal: 21500,
          },
        ],
      },
      {
        orderDate: new Date("2026-06-01T16:00:00"),
        deliveryDate: new Date("2026-06-02T12:00:00"),
        totalAmount: 45000,
        source: "local",
        status: "en_cocina",
        notes: "Orden para evento",
        items: [
          {
            productNameSnapshot: "X3 Torta Chocolate",
            quantity: 3,
            unitPrice: 15000,
            subtotal: 45000,
          },
        ],
      },
      {
        orderDate: new Date("2026-06-01T17:30:00"),
        deliveryDate: new Date("2026-06-02T13:00:00"),
        totalAmount: 28500,
        source: "local",
        status: "en_cocina",
        notes: null,
        items: [
          {
            productNameSnapshot: "X1 Pizza Vegetariana + X1 Empanadas",
            quantity: 2,
            unitPrice: 14250,
            subtotal: 28500,
          },
        ],
      },
      {
        orderDate: new Date("2026-06-02T09:00:00"),
        deliveryDate: new Date("2026-06-02T13:30:00"),
        totalAmount: 16800,
        source: "local",
        status: "pendiente",
        notes: null,
        items: [
          {
            productNameSnapshot: "X3 Docena Empanadas",
            quantity: 3,
            unitPrice: 5600,
            subtotal: 16800,
          },
        ],
      },
      {
        orderDate: new Date("2026-06-02T09:45:00"),
        deliveryDate: new Date("2026-06-02T14:00:00"),
        totalAmount: 38000,
        source: "local",
        status: "pendiente",
        notes: "Orden importante - VIP",
        items: [
          {
            productNameSnapshot: "X2 Pizza Especial + X1 Tabla de Quesos",
            quantity: 3,
            unitPrice: 12666,
            subtotal: 38000,
          },
        ],
      },
    ];

    for (let i = 0; i < SAMPLE_ORDERS.length; i++) {
      const orderData = SAMPLE_ORDERS[i];
      const { items, ...orderInfo } = orderData;

      // Usar findOrCreate para evitar duplicados
      const [order, created] = await CustomerOrder.findOrCreate({
        where: {
          orderDate: orderData.orderDate,
          totalAmount: orderData.totalAmount,
        },
        defaults: orderInfo,
      });

      if (created) {
        // Crear items para la orden
        if (items && items.length > 0) {
          await OrderItem.bulkCreate(
            items.map((item) => ({ ...item, orderId: order.id }))
          );
        }

        console.log(
          `✅ Orden creada: #${order.id.substring(0, 8)} | Estado: ${order.status} | Monto: $${order.totalAmount}`
        );
      }
    }

    console.log("✅ Órdenes iniciales procesadas correctamente");
  } catch (error) {
    console.error("❌ Error en createInitialOrders:", error);
  }
}
