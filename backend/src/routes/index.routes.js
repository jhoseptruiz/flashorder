"use strict";
import { Router } from "express";
import authRoutes from "./auth.routes.js";

const router = Router();

// Ruta de salud del servidor
router.get("/", (req, res) => {
  res.json({ message: "FlashOrder API corriendo OK" });
});

// Rutas de autenticación
router.use("/auth", authRoutes);

export default router;