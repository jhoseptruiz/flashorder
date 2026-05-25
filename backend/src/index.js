"use strict";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import express, { json, urlencoded } from "express";
import { HOST, PORT } from "./config/configEnv.js";  // ← corregido
import pool from "./db/db.js";
import indexRoutes from "./routes/index.routes.js";
import { createInitialUsers } from "./config/initialSetup.js";

async function setupServer() {
  try {
    const app = express();

    app.disable("x-powered-by");
    const allowedOrigin = process.env.FRONTEND_URL;
    app.use(cors({ credentials: true, origin: allowedOrigin }));
    console.log(`=> CORS configurado para: ${allowedOrigin}`);
    app.use(urlencoded({ extended: true, limit: "1mb" }));
    app.use(json({ limit: "1mb" }));
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
    await pool.query("SELECT 1");
    console.log("=> Base de datos lista");
    await createInitialUsers();
    await setupServer();
  } catch (error) {
    console.log("Error en setupAPI():", error);
  }
}

setupAPI()
  .then(() => console.log("=> API FlashOrder iniciada exitosamente"))
  .catch((error) => console.log("Error:", error));