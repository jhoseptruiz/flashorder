"use strict";
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";

const router = Router();

// Ruta de salud del servidor
router.get("/", (req, res) => {
  res.json({ message: "FlashOrder API corriendo OK" });
});

// Rutas de autenticación
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);

export default router;