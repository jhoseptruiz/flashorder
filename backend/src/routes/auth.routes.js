"use strict";
import { Router } from "express";
import { loginService } from "../services/auth.service.js";
import { createAuditLog } from "../helpers/audit.helper.js";
import { authenticate } from "../middlewares/authentication.middleware.js";

const router = Router();

// POST 
router.post("/login", async (req, res) => {
  try {
    console.log("=> POST /auth/login recibido");
    console.log("   Body:", req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("   Error: Email o password vacío");
      return res.status(400).json({ error: "Email y contraseña son requeridos" });
    }

    console.log(`   Intentando login con: ${email}`);
    const result = await loginService(email, password);
    console.log("   Resultado de loginService:", result);

    if (result.error) {
      console.log(`   Error de autenticación: ${result.error}`);
      return res.status(result.status).json({ error: result.error });
    }

    console.log("   Login exitoso para:", email);

    // Registrar auditoría de inicio de sesión
    await createAuditLog(
      result.user.rut,
      "LOGIN",
      "users",
      result.user.rut,
      null,
      { email, fullName: result.user.full_name }
    );

    return res.status(200).json({
      message: "Login exitoso",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Error en POST /auth/login:", error.message, error.stack);
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
});

// POST /api/auth/logout
router.post("/logout", authenticate, async (req, res) => {
  try {
    const userRut = req.user.rut;

    await createAuditLog(
      userRut,
      "LOGOUT",
      "users",
      userRut,
      null,
      { details: "El usuario cerró sesión manualmente" }
    );

    res.json({ message: "Logout exitoso y auditoría registrada" });
  } catch (error) {
    console.error("Error en logout:", error);
    res.status(500).json({ error: "Error al cerrar sesión" });
  }
});

// GET /me -> Obtener perfil del usuario autenticado
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
