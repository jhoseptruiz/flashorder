"use strict";
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";
import usersRoutes from "./users.routes.js";
import ordersRoutes from "./orders.routes.js";
import catalogRoutes from "./catalog.routes.js";
import posRoutes from "./pos.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import auditLogsRoutes from "./auditLogs.routes.js";
import cashRegisterRoutes from "./cashRegister.routes.js";
import webhookRoutes from "./webhook.routes.js";
import uberRoutes from "./uber.routes.js";
import { getDashboardStatsController } from "../controllers/dashboard.controller.js";

const router = Router();

// Ruta de salud del servidor
router.get("/", (req, res) => {
  res.json({ message: "FlashOrder API corriendo OK" });
});

// Rutas de autenticación
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/orders", ordersRoutes);
router.use("/catalog", catalogRoutes);
router.use("/pos", posRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/audit-logs", auditLogsRoutes);
router.use("/cash-register", cashRegisterRoutes);
router.use("/webhook", webhookRoutes);
router.use("/uber", uberRoutes);

// Ruta protegida del dashboard (admin y empleado)
router.get("/dashboard-stats", authenticate, authorizeRoles("admin", "empleado"), getDashboardStatsController);

export default router;