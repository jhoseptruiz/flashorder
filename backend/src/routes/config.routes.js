import { Router } from "express";
import { getBusinessHours, updateBusinessHours } from "../controllers/config.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";

const router = Router();

// Endpoint público o autenticado general para lectura
router.get("/business-hours", getBusinessHours);

// Endpoint admin para escritura
router.put("/business-hours", authenticate, authorizeRoles("admin"), updateBusinessHours);

export default router;
