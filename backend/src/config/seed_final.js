"use strict";
import sequelize from "../db/db.js";
import "../models/index.models.js"; // Ensure models are loaded
import User from "../models/User.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";
import CustomerOrder from "../models/CustomerOrder.js";
import OrderItem from "../models/OrderItem.js";
import Promotion from "../models/Promotion.js";
import Coupon from "../models/Coupon.js";
import SystemConfig from "../models/SystemConfig.js";
import Customer from "../models/Customer.js";
import CompositionRule from "../models/CompositionRule.js";
import CashRegisterSession from "../models/CashRegisterSession.js";
import CashRegisterTransaction from "../models/CashRegisterTransaction.js";
import AuditLog from "../models/AuditLog.js";
import { hashPassword } from "../helpers/bcrypt.helper.js";

export async function seedDatabase() {
  try {
    console.log("==> Iniciando Seed Final...");
    
    // 1. Eliminar y recrear las tablas (Wipe)
    await sequelize.sync({ force: true });
    console.log("==> Tablas eliminadas y recreadas correctamente.");

    // 2. Configuración
    await SystemConfig.create({
      appName: "Pizzería & Computación",
      logoPath: null,
      backupIntervalHours: 24,
      backupEmail: "admin@flashorder.cl",
      businessHours: {
        workDays: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
        openTime: "09:00",
        closeTime: "22:00"
      }
    });
    console.log("==> Configuración inicial creada.");

    // 3. Usuarios
    const passHash = await hashPassword("admin1234");
    await User.bulkCreate([
      { rut: "111111111", fullName: "Administrador Demo", email: "admin@flashorder.cl", passwordHash: passHash, role: "admin", isActive: true },
      { rut: "222222222", fullName: "Empleado Juan", email: "empleado1@flashorder.cl", passwordHash: await hashPassword("empleado1234"), role: "empleado", isActive: true },
      { rut: "333333333", fullName: "Empleado Maria", email: "empleado2@flashorder.cl", passwordHash: await hashPassword("empleado1234"), role: "empleado", isActive: true },
      { rut: "444444444", fullName: "Cocinero Pedro", email: "cocinero@flashorder.cl", passwordHash: await hashPassword("cocinero1234"), role: "cocinero", isActive: true }
    ]);
    console.log("==> Usuarios creados.");

    // 4. Categorías
    const catPizzas = await Category.create({ name: "Pizzas", behavior: "independiente", displayOrder: 1 });
    const catMasas = await Category.create({ name: "Masas", behavior: "base", displayOrder: 2, minItems: 1, maxItems: 1 });
    const catCompPizzas = await Category.create({ name: "Ingredientes Extra", behavior: "complemento", displayOrder: 3, minItems: 0, maxItems: 7 });
    const catBebidas = await Category.create({ name: "Bebidas", behavior: "independiente", displayOrder: 4 });
    
    const catServicios = await Category.create({ name: "Servicios Técnicos", behavior: "independiente", displayOrder: 5 });
    const catGabinetes = await Category.create({ name: "Gabinetes Base", behavior: "base", displayOrder: 6, minItems: 1, maxItems: 1 });
    const catComponentes = await Category.create({ name: "Componentes PC", behavior: "complemento", displayOrder: 7, minItems: 0, maxItems: 15 });

    // 5. Productos y Variantes
    // Pizzas
    const pzMargarita = await Product.create({ categoryId: catPizzas.id, name: "Pizza Margarita", isActive: true, isComposite: false });
    await ProductVariant.bulkCreate([
      { productId: pzMargarita.id, variantName: "Mediana", price: 8000, isActive: true },
      { productId: pzMargarita.id, variantName: "Familiar", price: 11000, isActive: true }
    ]);

    const pzPepperoni = await Product.create({ categoryId: catPizzas.id, name: "Pizza Pepperoni", isActive: true, isComposite: false });
    await ProductVariant.create({ productId: pzPepperoni.id, variantName: "Familiar", price: 12500, isActive: true });

    // Bases Pizzas (Masas)
    const masaPiedra = await Product.create({ categoryId: catMasas.id, name: "Masa a la Piedra", isActive: true, isComposite: false, relatedCategoryId: catPizzas.id });
    await ProductVariant.create({ productId: masaPiedra.id, variantName: "Familiar", price: 9000, isActive: true });
    const masaTradicional = await Product.create({ categoryId: catMasas.id, name: "Masa Tradicional", isActive: true, isComposite: false, relatedCategoryId: catPizzas.id });
    await ProductVariant.create({ productId: masaTradicional.id, variantName: "Familiar", price: 8000, isActive: true });

    // Compuestos Pizzas (Ingredientes)
    const ingQueso = await Product.create({ categoryId: catCompPizzas.id, name: "Extra Queso", isActive: true, isComposite: false, relatedCategoryId: catPizzas.id });
    await ProductVariant.create({ productId: ingQueso.id, variantName: "Porción", price: 1000, isActive: true });
    
    const ingPepperoni = await Product.create({ categoryId: catCompPizzas.id, name: "Extra Pepperoni", isActive: true, isComposite: false, relatedCategoryId: catPizzas.id });
    await ProductVariant.create({ productId: ingPepperoni.id, variantName: "Porción", price: 1500, isActive: true });

    // Compuesta Pizza
    const pzArma = await Product.create({ categoryId: catPizzas.id, name: "Pizza Personalizada", isActive: true, isComposite: true, baseCategoryId: catMasas.id });
    await ProductVariant.create({ productId: pzArma.id, variantName: "Unica", price: 0, isActive: true });

    // Bebidas
    const bebida = await Product.create({ categoryId: catBebidas.id, name: "Coca Cola", isActive: true, isComposite: false });
    await ProductVariant.bulkCreate([
      { productId: bebida.id, variantName: "Lata 350ml", price: 1500, isActive: true },
      { productId: bebida.id, variantName: "1.5 Litros", price: 2500, isActive: true }
    ]);

    // Computadores
    // Componentes PC
    const ram = await Product.create({ categoryId: catComponentes.id, name: "Memoria RAM", isActive: true, isComposite: false, relatedCategoryId: catServicios.id });
    await ProductVariant.create({ productId: ram.id, variantName: "16GB DDR4", price: 45000, isActive: true });
    
    const ssd = await Product.create({ categoryId: catComponentes.id, name: "Disco SSD", isActive: true, isComposite: false, relatedCategoryId: catServicios.id });
    await ProductVariant.create({ productId: ssd.id, variantName: "1TB M.2", price: 65000, isActive: true });

    // Gabinetes Base
    const gabGamer = await Product.create({ categoryId: catGabinetes.id, name: "Gabinete Gamer RGB", isActive: true, isComposite: false, relatedCategoryId: catServicios.id });
    await ProductVariant.create({ productId: gabGamer.id, variantName: "ATX", price: 50000, isActive: true });
    const gabOficina = await Product.create({ categoryId: catGabinetes.id, name: "Gabinete Oficina", isActive: true, isComposite: false, relatedCategoryId: catServicios.id });
    await ProductVariant.create({ productId: gabOficina.id, variantName: "MicroATX", price: 25000, isActive: true });

    // Compuesto PC
    const armado = await Product.create({ categoryId: catServicios.id, name: "Armado de PC", isActive: true, isComposite: true, baseCategoryId: catGabinetes.id });
    await ProductVariant.create({ productId: armado.id, variantName: "Unica", price: 0, isActive: true });

    // Mantención
    const mantencion = await Product.create({ categoryId: catServicios.id, name: "Mantención Preventiva", isActive: true, isComposite: false });
    await ProductVariant.create({ productId: mantencion.id, variantName: "Standard", price: 25000, isActive: true });

    console.log("==> Categorías y Productos creados.");

    // 5.5 Reglas de composición
    await CompositionRule.create({ baseCategoryId: catMasas.id, allowedCategoryId: catCompPizzas.id, minItems: 0, maxItems: 7, stepOrder: 1 });
    await CompositionRule.create({ baseCategoryId: catGabinetes.id, allowedCategoryId: catComponentes.id, minItems: 0, maxItems: 15, stepOrder: 1 });
    console.log("==> Reglas de composición creadas.");

    // 6. Cupones y Promociones
    await Coupon.create({ code: "DEMO2026", discountType: "percentage", discountValue: 15, isActive: true, usageLimit: 100, usedCount: 0 });
    const today = new Date();
    await Promotion.create({ name: "Descuento Verano", promotionType: "threshold", conditionMinAmount: 15000, rewardDiscountType: "fixed", rewardValue: 2000, isActive: true });
    console.log("==> Cupones y Promociones creados.");

    // 7. Pedidos de demostración (Viernes 10 de Julio 2026)
    const presentationDate = new Date("2026-07-10T00:00:00-04:00");
    const getPresDate = (hours, minutes = 0) => {
      const d = new Date(presentationDate);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    const dummyOrders = [
      { // 1. Entregado
        customerName: "Juan Pérez", customerPhone: "987654321", status: "entregado", paymentMethod: "efectivo",
        orderDate: getPresDate(11, 0), deliveryDate: getPresDate(12, 0), totalAmount: 11000, depositAmount: 11000, cashReceived: 15000, cashChange: 4000, source: "local",
        items: [{ productNameSnapshot: "Pizza Margarita", variantNameSnapshot: "Familiar", quantity: 1, unitPrice: 11000, subtotal: 11000 }]
      },
      { // 2. Pendiente
        customerName: "María López", customerPhone: "912345678", status: "pendiente", paymentMethod: "transferencia",
        orderDate: getPresDate(10, 30), deliveryDate: getPresDate(19, 0), totalAmount: 1200000, depositAmount: 1200000, cashReceived: 0, cashChange: 0, source: "local", notes: "Retira en la tarde",
        items: [{ productNameSnapshot: "Notebook Asus ROG", variantNameSnapshot: "RTX 4060", quantity: 1, unitPrice: 1200000, subtotal: 1200000 }]
      },
      { // 3. Compuesto (En Cocina)
        customerName: "Carlos Vega", customerPhone: "999888777", status: "en_cocina", paymentMethod: "tarjeta",
        orderDate: getPresDate(13, 0), deliveryDate: getPresDate(14, 0), totalAmount: 140000, depositAmount: 140000, cashReceived: 0, cashChange: 0, source: "local",
        items: [{ productNameSnapshot: "Armado de PC", variantNameSnapshot: "Unica", quantity: 1, unitPrice: 30000, subtotal: 140000, components: [{ category: "Componentes PC", productName: "Memoria RAM", variantName: "16GB DDR4", quantity: 1, unitPrice: 45000 }, { category: "Componentes PC", productName: "Disco SSD", variantName: "1TB M.2", quantity: 1, unitPrice: 65000 }] }]
      },
      { // 4. Uber Eats (Pendiente)
        customerName: "Cliente Uber", customerPhone: "000000000", status: "pendiente_uber", paymentMethod: "tarjeta",
        orderDate: getPresDate(14, 30), deliveryDate: getPresDate(15, 0), totalAmount: 12500, depositAmount: 12500, cashReceived: 0, cashChange: 0, source: "uber_eats", externalOrderId: "UBER-5555",
        items: [{ productNameSnapshot: "Pizza Pepperoni", variantNameSnapshot: "Familiar", quantity: 1, unitPrice: 12500, subtotal: 12500 }]
      },
      { // 5. Cancelado
        customerName: "Pedro Soto", customerPhone: "922222222", status: "cancelado", paymentMethod: "efectivo",
        orderDate: getPresDate(9, 0), deliveryDate: getPresDate(10, 0), totalAmount: 25000, depositAmount: 0, cashReceived: 0, cashChange: 0, source: "local", notes: "No vino a buscar",
        items: [{ productNameSnapshot: "Mantención Preventiva", variantNameSnapshot: "Standard", quantity: 1, unitPrice: 25000, subtotal: 25000 }]
      },
    ];

    for (const o of dummyOrders) {
      const customer = await Customer.create({
        fullName: o.customerName,
        phone: o.customerPhone,
        email: null
      });

      const order = await CustomerOrder.create({
        customerId: customer.id,
        status: o.status,
        paymentMethod: o.paymentMethod,
        orderDate: o.orderDate,
        deliveryDate: o.deliveryDate,
        totalAmount: o.totalAmount,
        depositAmount: o.depositAmount,
        cashReceived: o.cashReceived,
        cashChange: o.cashChange,
        source: o.source,
        externalOrderId: o.externalOrderId,
        notes: o.notes,
      });

      for (const i of o.items) {
        await OrderItem.create({
          orderId: order.id,
          productNameSnapshot: i.productNameSnapshot,
          variantNameSnapshot: i.variantNameSnapshot,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
          components: i.components,
        });
      }
    }
    console.log("==> Pedidos de prueba creados.");

    // 8. Registros de Auditoría
    const empleadoUser = await User.findOne({ where: { role: "empleado" } });
    
    const getPrevDayDate = (hours, minutes = 0) => {
      const d = new Date(presentationDate);
      d.setDate(d.getDate() - 1);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    await AuditLog.bulkCreate([
      {
        userRut: adminUser.rut,
        action: "LOGIN",
        tableAffected: "users",
        recordId: adminUser.id,
        oldData: null,
        newData: { ip: "192.168.1.1", device: "PC Caja Principal" },
        createdAt: getPrevDayDate(8, 50),
      },
      {
        userRut: adminUser.rut,
        action: "OPEN_REGISTER",
        tableAffected: "cash_register_sessions",
        recordId: "uuid-simulado",
        oldData: null,
        newData: { openingAmount: 50000, notes: "Apertura turno mañana" },
        createdAt: getPrevDayDate(8, 55),
      },
      {
        userRut: empleadoUser.rut,
        action: "LOGIN",
        tableAffected: "users",
        recordId: empleadoUser.id,
        oldData: null,
        newData: { ip: "192.168.1.15", device: "Tablet Mesero" },
        createdAt: getPrevDayDate(9, 10),
      },
      {
        userRut: empleadoUser.rut,
        action: "CREATE_ORDER",
        tableAffected: "customer_orders",
        recordId: "uuid-simulado",
        oldData: null,
        newData: { totalAmount: 11000, items: 1, source: "local" },
        createdAt: getPrevDayDate(11, 0),
      },
      {
        userRut: adminUser.rut,
        action: "UPDATE_PRODUCT",
        tableAffected: "products",
        recordId: "uuid-simulado",
        oldData: { price: 12000 },
        newData: { price: 12500, notes: "Ajuste por inflación" },
        createdAt: getPrevDayDate(15, 30),
      },
      {
        userRut: adminUser.rut,
        action: "CLOSE_REGISTER",
        tableAffected: "cash_register_sessions",
        recordId: "uuid-simulado",
        oldData: { status: "open" },
        newData: { status: "closed", finalAmount: 155000, difference: 0 },
        createdAt: getPrevDayDate(22, 10),
      }
    ]);
    console.log("==> Registros de Auditoría creados.");

    console.log("✅ SEED FINALIZADO CON ÉXITO.");
  } catch (error) {
    console.error("❌ Error en seed:", error);
    throw error;
  }
}
