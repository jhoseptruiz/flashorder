import { Router } from "express";
import * as ordersController from "../controllers/orders.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";

const ordersRouter = Router();

// Proteger todas las rutas con autenticación
ordersRouter.use(authenticate);

// Obtener órdenes por estado (acceso para cocineros y admin)
ordersRouter.get(
  "/status/:status",
  authorizeRoles("admin", "cocinero"),
  ordersController.getOrdersByStatusController
);

// Obtener órdenes para el calendario de la cocina
ordersRouter.get(
  "/kitchen/calendar",
  authorizeRoles("admin", "cocinero"),
  ordersController.getOrdersForKitchenController
);

// Actualizar estado de una orden
ordersRouter.put(
  "/:orderId/status",
  authorizeRoles("admin", "cocinero"),
  ordersController.updateOrderStatusController
);

// Obtener detalles de una orden específica
ordersRouter.get(
  "/:orderId",
  authorizeRoles("admin", "cocinero", "empleado"),
  ordersController.getOrderByIdController
);

export default ordersRouter;
