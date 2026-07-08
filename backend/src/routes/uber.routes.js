"use strict";
import { Router } from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";
import {
  getStoreStatusController,
  setStoreStatusController,
  triggerMenuSyncController,
} from "../controllers/uberEats.controller.js";

const router = Router();

// Todas las rutas de Uber requieren autenticación y rol admin
router.use(authenticate);
router.use(authorizeRoles("admin"));

// ── Estado de la tienda ──────────────────────────────────────────────────────
router.get("/store/status", getStoreStatusController);
router.post("/store/status", setStoreStatusController);

// ── Sincronización manual del menú ───────────────────────────────────────────
router.post("/menu/sync", triggerMenuSyncController);

export default router;
