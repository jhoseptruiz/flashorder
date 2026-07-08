import { Router } from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";
import {
  getActiveSessionController,
  openSessionController,
  closeSessionController,
  getSessionDetailsController,
  getAllSessionsController,
} from "../controllers/cashRegister.controller.js";

const cashRegisterRouter = Router();

// Todas las rutas de caja requieren autenticación
cashRegisterRouter.use(authenticate);

// Obtener sesión activa (admin y empleado)
cashRegisterRouter.get(
  "/session/active",
  authorizeRoles("admin", "empleado"),
  getActiveSessionController
);

// Abrir caja (admin y empleado)
cashRegisterRouter.post(
  "/open",
  authorizeRoles("admin", "empleado"),
  openSessionController
);

// Cerrar caja (admin y empleado)
cashRegisterRouter.post(
  "/close",
  authorizeRoles("admin", "empleado"),
  closeSessionController
);

// Obtener detalles de una sesión de caja por ID (admin y empleado)
cashRegisterRouter.get(
  "/sessions/:id",
  authorizeRoles("admin", "empleado"),
  getSessionDetailsController
);

// Obtener todas las sesiones (turnos) — solo admin
cashRegisterRouter.get(
  "/sessions",
  authorizeRoles("admin"),
  getAllSessionsController
);

export default cashRegisterRouter;
