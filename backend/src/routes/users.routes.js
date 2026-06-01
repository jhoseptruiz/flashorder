"use strict";
import { Router } from "express";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  checkRutUnique,
  checkEmailUnique,
} from "../controllers/users.controller.js";

const router = Router();

router.get("/check-rut", requireAdmin, checkRutUnique);
router.get("/check-email", requireAdmin, checkEmailUnique);
router.get("/", requireAdmin, getUsers);
router.post("/", requireAdmin, createUser);
router.put("/:rut", requireAdmin, updateUser);
router.delete("/:rut", requireAdmin, deleteUser);

export default router;
