import { Router } from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";
import {
  createOrderController,
  getCompositionRulesController,
} from "../controllers/pos.controller.js";

const posRouter = Router();

// Todas las rutas del POS requieren autenticación
posRouter.use(authenticate);

// Crear un pedido desde el POS (admin y empleado)
posRouter.post(
  "/orders",
  authorizeRoles("admin", "empleado"),
  createOrderController
);

// Obtener reglas de composición para productos compuestos
posRouter.get(
  "/composition-rules",
  authorizeRoles("admin", "empleado"),
  getCompositionRulesController
);

export default posRouter;
