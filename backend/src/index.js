"use strict";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { HOST, PORT } from "./config/configEnv.js";
import indexRoutes from "./routes/index.routes.js";
import sequelize from "./db/db.js"; 
import "./models/index.models.js"; 
import { createInitialUsers } from "./config/initialSetup.js";
import { createInitialOrders } from "./config/intialSeptupOrder.js";

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

    await sequelize.sync();
    console.log("=> Modelos sincronizados con la base de datos");

    await createInitialUsers();
    await createInitialOrders();
    await setupServer();
  } catch (error) {
    console.log("Error crítico en setupAPI():", error);
  }
}

setupAPI()
  .then(() => console.log("=> API FlashOrder iniciada exitosamente"))
  .catch((error) => console.log("Error:", error));