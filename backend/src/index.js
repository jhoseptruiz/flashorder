"use strict";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { HOST, PORT } from "./config/configEnv.js";
import indexRoutes from "./routes/index.routes.js";
import sequelize from "./db/db.js"; 
import "./models/index.models.js"; 
import { seedDatabase } from "./config/seed_final.js";
import User from "./models/User.js";


async function setupServer() {
  try {
    const app = express();

    app.disable("x-powered-by");
    const allowedOrigin = process.env.FRONTEND_URL;
    app.use(cors({ credentials: true, origin: allowedOrigin }));
    console.log(`=> CORS configurado para: ${allowedOrigin}`);
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    app.use(express.json({ limit: "10mb" }));
    app.use(cookieParser());
    app.use(morgan("dev"));

    app.use("/api", indexRoutes);

    app.listen(PORT, () => {
      console.log(`=> Servidor corriendo en ${HOST}:${PORT}/api`);
    });
  } catch (error) {
    console.log("Error en setupServer():", error);
  }
}

async function setupAPI() {
  try {
    await sequelize.authenticate();
    console.log("=> Base de datos conectada vía Sequelize");
    
    // Agregar columnas nuevas manualmente (evita conflicto con ENUMs en alter)
    const addColumnIfNotExists = async (table, column, type, defaultVal) => {
      try {
        await sequelize.query(
          `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type}${defaultVal !== undefined ? ` DEFAULT ${defaultVal}` : ''};`
        );
      } catch (e) {
        // Columna ya existe, ignorar
      }
    };

    await addColumnIfNotExists("categories", "min_items", "INTEGER", 0);
    await addColumnIfNotExists("categories", "max_items", "INTEGER", "NULL");
    await addColumnIfNotExists("products", "related_category_id", "UUID", "NULL");
    await addColumnIfNotExists("customer_orders", "payment_method", "VARCHAR(120)", "NULL");
    await addColumnIfNotExists("customer_orders", "company_name", "VARCHAR(255)", "NULL");
    await addColumnIfNotExists("customer_orders", "company_logo", "TEXT", "NULL");
    await addColumnIfNotExists("customer_orders", "cash_received", "BIGINT", 0);
    await addColumnIfNotExists("customer_orders", "cash_change", "BIGINT", 0);
    await addColumnIfNotExists("customer_orders", "cash_register_session_id", "UUID", "NULL");
    
    // Cupones y Promociones (agrega timestamps que faltaron en la db)
    await addColumnIfNotExists("coupons", "created_at", "TIMESTAMP WITH TIME ZONE", "CURRENT_TIMESTAMP");
    await addColumnIfNotExists("coupons", "updated_at", "TIMESTAMP WITH TIME ZONE", "CURRENT_TIMESTAMP");
    await addColumnIfNotExists("promotions", "created_at", "TIMESTAMP WITH TIME ZONE", "CURRENT_TIMESTAMP");
    await addColumnIfNotExists("promotions", "updated_at", "TIMESTAMP WITH TIME ZONE", "CURRENT_TIMESTAMP");

    // Discount fields for categories
    try {
      await sequelize.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_categories_discount_type') THEN CREATE TYPE "enum_categories_discount_type" AS ENUM ('none', 'percentage', 'fixed'); END IF; END $$;`);
    } catch(e) { /* type exists */ }
    await addColumnIfNotExists("categories", "discount_type", '"enum_categories_discount_type"', "'none'");
    await addColumnIfNotExists("categories", "discount_value", "INTEGER", 0);
    await addColumnIfNotExists("categories", "discount_active", "BOOLEAN", "false");
    await addColumnIfNotExists("categories", "is_accumulable", "BOOLEAN", "false");
    await addColumnIfNotExists("categories", "discount_expiration_date", "TIMESTAMP WITH TIME ZONE", "NULL");
    await addColumnIfNotExists("categories", "discount_active_days", "JSON", "NULL");

    // Discount fields for products
    try {
      await sequelize.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_products_discount_type') THEN CREATE TYPE "enum_products_discount_type" AS ENUM ('none', 'percentage', 'fixed'); END IF; END $$;`);
    } catch(e) { /* type exists */ }
    await addColumnIfNotExists("products", "discount_type", '"enum_products_discount_type"', "'none'");
    await addColumnIfNotExists("products", "discount_value", "INTEGER", 0);
    await addColumnIfNotExists("products", "discount_active", "BOOLEAN", "false");
    await addColumnIfNotExists("products", "is_accumulable", "BOOLEAN", "false");

    await sequelize.sync();
    console.log("=> Modelos sincronizados con la base de datos");

    // Revisar si la base de datos está vacía para poblarla automáticamente
    const userCount = await User.count();
    if (userCount === 0) {
      console.log("=> Base de datos vacía. Ejecutando seed automático...");
      await seedDatabase();
    }

    await setupServer();
  } catch (error) {
    console.log("Error crítico en setupAPI():", error);
  }
}

setupAPI()
  .then(() => console.log("=> API FlashOrder iniciada exitosamente"))
  .catch((error) => console.log("Error:", error));