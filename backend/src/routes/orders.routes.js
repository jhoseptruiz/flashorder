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

// Actualizar estado de una orden (empleado puede marcar como entregado)
ordersRouter.put(
  "/:orderId/status",
  authorizeRoles("admin", "cocinero", "empleado"),
  ordersController.updateOrderStatusController
);

// Obtener detalles de una orden específica
ordersRouter.get(
  "/:orderId",
  authorizeRoles("admin", "cocinero", "empleado"),
  ordersController.getOrderByIdController
);

// Cancelar una orden (Producción o Empleado)
ordersRouter.post(
  "/:orderId/cancel",
  authorizeRoles("admin", "cocinero", "empleado"),
  ordersController.cancelOrderController
);

// Actualizar información de cancelación (Empleado confirma devolución)
ordersRouter.put(
  "/:orderId/cancel",
  authorizeRoles("admin", "empleado"),
  ordersController.updateCancelOrderController
);

// ── Rutas para el Empleado ────────────────────────────────────────────────────

// Todos los pedidos activos (excluye entregado) con filtro opcional de fechas
ordersRouter.get(
  "/employee/active",
  authorizeRoles("admin", "empleado"),
  ordersController.getOrdersForEmployeeController
);

// Pedidos pendiente_uber (primer recuadro del empleado)
ordersRouter.get(
  "/employee/uber-pending",
  authorizeRoles("admin", "empleado"),
  ordersController.getUberPendingOrdersController
);

export default ordersRouter;
