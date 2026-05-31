"use strict";
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";
import usersRoutes from "./users.routes.js";

const router = Router();

// Ruta de salud del servidor
router.get("/", (req, res) => {
  res.json({ message: "FlashOrder API corriendo OK" });
});

// Rutas de autenticación
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);

// Ejemplo de ruta protegida para el futuro (solo admin y empleado)
router.get("/dashboard-stats", authenticate, authorizeRoles("admin", "empleado"), (req, res) => {
  res.json({ message: "Stats del dashboard (ruta protegida)", user: req.user });
});

export default router;