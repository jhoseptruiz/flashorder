"use strict";
import { Router } from "express";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import {
  getAllUsersService,
  createUserService,
  updateUserService,
  deleteUserService,
} from "../services/users.service.js";

const router = Router();

router.get("/", requireAdmin, async (req, res) => {
  try {
    const users = await getAllUsersService();
    return res.status(200).json(users);
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { rut, full_name, email, password, role } = req.body;

    if (!rut || !full_name || !email || !password || !role) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const user = await createUserService({ rut, full_name, email, password, role });
    return res.status(201).json(user);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return res.status(400).json({ error: error.message || "No se pudo crear el usuario" });
  }
});

router.put("/:rut", requireAdmin, async (req, res) => {
  try {
    const { rut } = req.params;
    const user = await updateUserService(rut, req.body);
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return res.status(400).json({ error: error.message || "No se pudo actualizar el usuario" });
  }
});

router.delete("/:rut", requireAdmin, async (req, res) => {
  try {
    const { rut } = req.params;
    const result = await deleteUserService(rut);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return res.status(400).json({ error: error.message || "No se pudo eliminar el usuario" });
  }
});

export default router;
