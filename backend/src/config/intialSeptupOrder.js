"use strict";
import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";

export async function createInitialOrders() {
  try {
    const today = new Date();
    
    // Función helper para generar fechas relativas a hoy
    const daysAgo = (days, hours = 12, minutes = 0) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    // Datos de órdenes de prueba alineados con el catálogo
    const SAMPLE_ORDERS = [
      {
        orderDate: daysAgo(0, 13, 15),
        deliveryDate: daysAgo(0, 14, 0),
        totalAmount: 18000,
        source: "local",
        status: "entregado",
        notes: "Sin servilletas",
        items: [
          {
            productNameSnapshot: "Pizza Margarita - Familiar",
            quantity: 1,
            unitPrice: 10000,
            subtotal: 10000,
          },
          {
            productNameSnapshot: "Pizza Margarita - Mediana",
            quantity: 1,
            unitPrice: 8000,
            subtotal: 8000,
          }
        ],
      },
      {
        orderDate: daysAgo(0, 14, 30),
        deliveryDate: daysAgo(0, 15, 30),
        totalAmount: 11500,
        source: "uber_eats",
        externalOrderId: "UBER-1001",
        status: "pendiente_uber",
        notes: "Timbre malo, llamar al llegar",
        items: [
          {
            productNameSnapshot: "Pizza Personalizada",
            quantity: 1,
            unitPrice: 10000,
            subtotal: 10000,
          },
          {
            productNameSnapshot: "Coca Cola - 1 Litro",
            quantity: 1,
            unitPrice: 1500,
            subtotal: 1500,
          }
        ],
      },
      {
        orderDate: daysAgo(1, 19, 0),
        deliveryDate: daysAgo(1, 19, 45),
        totalAmount: 25000,
        source: "local",
        status: "entregado",
        notes: null,
        items: [
          {
            productNameSnapshot: "Pizza Margarita - Familiar",
            quantity: 2,
            unitPrice: 10000,
            subtotal: 20000,
          },
          {
            productNameSnapshot: "Coca Cola - 2 Litros",
            quantity: 2,
            unitPrice: 2500,
            subtotal: 5000,
          }
        ],
      },
      {
        orderDate: daysAgo(2, 20, 15),
        deliveryDate: daysAgo(2, 21, 0),
        totalAmount: 13000,
        source: "uber_eats",
        externalOrderId: "UBER-1002",
        status: "entregado",
        notes: null,
        items: [
          {
            productNameSnapshot: "Pizza Personalizada (Masa a la Piedra + Extra Queso + Pepperoni)",
            quantity: 1,
            unitPrice: 13000,
            subtotal: 13000,
          }
        ],
      },
      {
        orderDate: daysAgo(3, 18, 30),
        deliveryDate: daysAgo(3, 19, 15),
        totalAmount: 8000,
        source: "local",
        status: "cancelado",
        notes: "Cliente no pasó a buscar",
        items: [
          {
            productNameSnapshot: "Pizza Margarita - Mediana",
            quantity: 1,
            unitPrice: 8000,
            subtotal: 8000,
          }
        ],
      },
      {
        orderDate: daysAgo(4, 12, 0),
        deliveryDate: daysAgo(4, 13, 0),
        totalAmount: 20000,
        source: "local",
        status: "entregado",
        notes: "Cumpleaños",
        items: [
          {
            productNameSnapshot: "Pizza Margarita - Familiar",
            quantity: 2,
            unitPrice: 10000,
            subtotal: 20000,
          }
        ],
      },
      {
        orderDate: daysAgo(0, 10, 0), // Hoy temprano, para tener pendientes
        deliveryDate: daysAgo(-1, 13, 0), // Entrega mañana
        totalAmount: 35000,
        source: "local",
        status: "pendiente",
        notes: "Pedido para mañana",
        items: [
          {
            productNameSnapshot: "Pizza Personalizada (Familiar) x3",
            quantity: 3,
            unitPrice: 10000,
            subtotal: 30000,
          },
          {
            productNameSnapshot: "Coca Cola - 2 Litros",
            quantity: 2,
            unitPrice: 2500,
            subtotal: 5000,
          }
        ],
      }
    ];

    for (let i = 0; i < SAMPLE_ORDERS.length; i++) {
      const orderData = SAMPLE_ORDERS[i];
      const { items, ...orderInfo } = orderData;

      // Usar findOrCreate para evitar duplicados, comparando por orderDate
      const [order, created] = await CustomerOrder.findOrCreate({
        where: {
          orderDate: orderData.orderDate
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
          `✅ Orden inicial creada: #${order.id.substring(0, 8)} | Estado: ${order.status} | Monto: $${order.totalAmount}`
        );
      }
    }

    console.log("✅ Órdenes iniciales procesadas correctamente");
  } catch (error) {
    console.error("❌ Error en createInitialOrders:", error);
  }
}
