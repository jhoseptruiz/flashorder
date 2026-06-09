"use strict";
import { Router } from "express";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  checkRutUnique,
  checkEmailUnique,
  getProfile,
  verifyProfilePassword,
  updateProfile,
} from "../controllers/users.controller.js";

const router = Router();

router.get("/me", authenticate, authorizeRoles("admin", "empleado", "cocinero"), getProfile);
router.post("/me/verify-password", authenticate, authorizeRoles("admin", "empleado", "cocinero"), verifyProfilePassword);
router.put("/me", authenticate, authorizeRoles("admin", "empleado", "cocinero"), updateProfile);
router.get("/check-rut", requireAdmin, checkRutUnique);
router.get("/check-email", requireAdmin, checkEmailUnique);
router.get("/", requireAdmin, getUsers);
router.post("/", requireAdmin, createUser);
router.put("/:rut", requireAdmin, updateUser);
router.delete("/:rut", requireAdmin, deleteUser);

export default router;
