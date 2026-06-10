import { Router } from "express";
import { getAuditLogs } from "../controllers/auditLogs.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";

const auditLogsRouter = Router();

// Todas las rutas requieren autenticación (el controlador filtra por rol)
auditLogsRouter.use(authenticate);

// GET /api/audit-logs
auditLogsRouter.get("/", getAuditLogs);

export default auditLogsRouter;
