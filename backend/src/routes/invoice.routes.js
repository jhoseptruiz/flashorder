import { Router } from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";
import { getInvoicesController, getInvoicePdfController } from "../controllers/invoice.controller.js";

const invoiceRouter = Router();

invoiceRouter.use(authenticate);

invoiceRouter.get(
  "/",
  authorizeRoles("admin", "empleado"),
  getInvoicesController
);

invoiceRouter.get(
  "/:id/pdf",
  authorizeRoles("admin", "empleado"),
  getInvoicePdfController
);

export default invoiceRouter;
