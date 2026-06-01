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

async function setupServer() {
  try {
    const app = express();

    app.disable("x-powered-by");
    const allowedOrigin = process.env.FRONTEND_URL;
    app.use(cors({ credentials: true, origin: allowedOrigin }));
    console.log(`=> CORS configurado para: ${allowedOrigin}`);
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));
    app.use(express.json({ limit: "1mb" }));
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
    
    await sequelize.sync();
    console.log("=> Modelos sincronizados con la base de datos");

    await createInitialUsers();
    await setupServer();
  } catch (error) {
    console.log("Error crítico en setupAPI():", error);
  }
}

setupAPI()
  .then(() => console.log("=> API FlashOrder iniciada exitosamente"))
  .catch((error) => console.log("Error:", error));