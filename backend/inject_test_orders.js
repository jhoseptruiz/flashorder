import "./src/models/index.models.js";
import CustomerOrder from "./src/models/CustomerOrder.js";
import OrderItem from "./src/models/OrderItem.js";
import sequelize from "./src/db/db.js";

async function inject() {
  try {
    const today = new Date();
    const orderDate1 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);
    const orderDate2 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0, 0);
    const deliveryDate1 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0);
    const deliveryDate2 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0, 0);

    const TEST_ORDERS = [
      {
        orderDate: orderDate1,
        deliveryDate: deliveryDate1,
        totalAmount: 15000,
        source: "uber_eats",
        externalOrderId: "UBER-TEST-03",
        status: "pendiente_uber",
        notes: "Por favor agregar salsas",
        items: [
          { productNameSnapshot: "Promo Uber 1", quantity: 1, unitPrice: 15000, subtotal: 15000 }
        ]
      },
      {
        orderDate: orderDate2,
        deliveryDate: deliveryDate2,
        totalAmount: 22000,
        source: "uber_eats",
        externalOrderId: "UBER-TEST-04",
        status: "pendiente_uber",
        notes: "Dejar en portería",
        items: [
          { productNameSnapshot: "Pizza Familiar Pepperoni", quantity: 1, unitPrice: 22000, subtotal: 22000 }
        ]
      },
      {
        orderDate: orderDate1,
        deliveryDate: deliveryDate1,
        totalAmount: 18000,
        source: "local",
        status: "pendiente",
        notes: "Cliente pagará con efectivo",
        items: [
          { productNameSnapshot: "Torta Tres Leches Pequeña", quantity: 1, unitPrice: 18000, subtotal: 18000 }
        ]
      },
      {
        orderDate: orderDate1,
        deliveryDate: deliveryDate2,
        totalAmount: 35000,
        source: "local",
        status: "en_cocina",
        notes: "",
        items: [
          { productNameSnapshot: "Docena de Empanadas Pino", quantity: 2, unitPrice: 17500, subtotal: 35000 }
        ]
      },
      {
        orderDate: orderDate1,
        deliveryDate: deliveryDate1,
        totalAmount: 12000,
        source: "local",
        status: "empacado",
        notes: "Retira a las 14:00",
        items: [
          { productNameSnapshot: "Pie de Limón", quantity: 1, unitPrice: 12000, subtotal: 12000 }
        ]
      }
    ];

    for (const orderData of TEST_ORDERS) {
      const { items, ...orderInfo } = orderData;
      const order = await CustomerOrder.create(orderInfo);
      
      if (items && items.length > 0) {
        await OrderItem.bulkCreate(
          items.map((item) => ({ ...item, orderId: order.id }))
        );
      }
      console.log(`✅ Orden Inyectada: ${order.status} | Total: ${order.totalAmount}`);
    }

  } catch (err) {
    console.error("❌ Error inyectando órdenes:", err);
  } finally {
    process.exit();
  }
}

inject();
