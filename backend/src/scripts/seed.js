"use strict";
import {
  Category,
  Product,
  ProductVariant,
  Customer,
  CustomerOrder,
  OrderItem,
  User,
} from "../models/index.models.js";
import sequelize from "../db/db.js";

async function runSeed() {
  try {
    console.log("Iniciando inyección de datos de prueba...");
    await sequelize.authenticate();
    console.log("Conexión a la base de datos establecida.");

    // 1. Crear Categorías
    const [catPizzas] = await Category.findOrCreate({
      where: { name: "Pizzas" },
      defaults: { behavior: "independiente", displayOrder: 1 },
    });
    const [catBebidas] = await Category.findOrCreate({
      where: { name: "Bebidas" },
      defaults: { behavior: "independiente", displayOrder: 2 },
    });
    const [catPostres] = await Category.findOrCreate({
      where: { name: "Postres" },
      defaults: { behavior: "independiente", displayOrder: 3 },
    });

    console.log("✅ Categorías creadas");

    // 2. Crear Productos y Variantes
    const [prodPizzaP] = await Product.findOrCreate({
      where: { name: "Pizza Pepperoni" },
      defaults: { categoryId: catPizzas.id, isComposite: false },
    });
    const [varPizzaPF] = await ProductVariant.findOrCreate({
      where: { productId: prodPizzaP.id, variantName: "Familiar" },
      defaults: { price: 14000 },
    });
    const [varPizzaPM] = await ProductVariant.findOrCreate({
      where: { productId: prodPizzaP.id, variantName: "Mediana" },
      defaults: { price: 10000 },
    });

    const [prodCoca] = await Product.findOrCreate({
      where: { name: "Coca Cola" },
      defaults: { categoryId: catBebidas.id, isComposite: false },
    });
    const [varCoca15] = await ProductVariant.findOrCreate({
      where: { productId: prodCoca.id, variantName: "1.5 Litros" },
      defaults: { price: 2500 },
    });

    const [prodTiramisu] = await Product.findOrCreate({
      where: { name: "Tiramisú" },
      defaults: { categoryId: catPostres.id, isComposite: false },
    });
    const [varTiramisuP] = await ProductVariant.findOrCreate({
      where: { productId: prodTiramisu.id, variantName: "Porción" },
      defaults: { price: 3500 },
    });

    console.log("✅ Productos y Variantes creados");

    // 3. Crear Clientes
    const [cliente1] = await Customer.findOrCreate({
      where: { email: "juan.perez@email.com" },
      defaults: { fullName: "Juan Pérez", phone: "+56912345678" },
    });
    const [cliente2] = await Customer.findOrCreate({
      where: { email: "maria.g@email.com" },
      defaults: { fullName: "María González", phone: "+56987654321" },
    });

    console.log("✅ Clientes creados");

    // 4. Obtener un usuario empleado para asignarlo como creador del pedido (opcional)
    const empleado = await User.findOne({ where: { role: "empleado" } });
    const createdByRut = empleado ? empleado.rut : null;

    // 5. Crear Pedidos e Items
    // Pedido 1: Juan Pérez (Pizza Familiar + Coca Cola)
    const total1 = (varPizzaPF.price * 1) + (varCoca15.price * 2);
    const order1 = await CustomerOrder.create({
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + 45 * 60000), // En 45 mins
      totalAmount: total1,
      source: "local",
      status: "pendiente",
      notes: "Timbre malo, llamar al llegar",
      customerId: cliente1.id,
      createdByRut,
    });

    await OrderItem.bulkCreate([
      {
        orderId: order1.id,
        variantId: varPizzaPF.id,
        productNameSnapshot: "Pizza Pepperoni - Familiar",
        quantity: 1,
        unitPrice: varPizzaPF.price,
        subtotal: varPizzaPF.price * 1,
      },
      {
        orderId: order1.id,
        variantId: varCoca15.id,
        productNameSnapshot: "Coca Cola - 1.5 Litros",
        quantity: 2,
        unitPrice: varCoca15.price,
        subtotal: varCoca15.price * 2,
      },
    ]);

    // Pedido 2: María González (2x Pizza Mediana + Tiramisú)
    const total2 = (varPizzaPM.price * 2) + (varTiramisuP.price * 3);
    const order2 = await CustomerOrder.create({
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + 60 * 60000), // En 1 hora
      totalAmount: total2,
      source: "uber_eats",
      externalOrderId: "UBER-999-XYZ",
      status: "en_cocina",
      notes: "Sin cubiertos",
      customerId: cliente2.id,
      createdByRut,
    });

    await OrderItem.bulkCreate([
      {
        orderId: order2.id,
        variantId: varPizzaPM.id,
        productNameSnapshot: "Pizza Pepperoni - Mediana",
        quantity: 2,
        unitPrice: varPizzaPM.price,
        subtotal: varPizzaPM.price * 2,
      },
      {
        orderId: order2.id,
        variantId: varTiramisuP.id,
        productNameSnapshot: "Tiramisú - Porción",
        quantity: 3,
        unitPrice: varTiramisuP.price,
        subtotal: varTiramisuP.price * 3,
      },
    ]);

    console.log("✅ Pedidos creados exitosamente");
    console.log("-----------------------------------------");
    console.log("¡Inyección de datos finalizada!");
    
    // Salir del proceso
    process.exit(0);
  } catch (error) {
    console.error("❌ Error durante el seed:", error);
    process.exit(1);
  }
}

runSeed();
