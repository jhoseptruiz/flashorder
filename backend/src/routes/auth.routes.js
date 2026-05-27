"use strict";
import { Router } from "express";
import { loginService, refreshTokenService } from "../services/auth.service.js";
import { jwtDurationToMs } from "../helpers/jwt.helper.js";

const router = Router();

// Obtener la duración del refresh token desde variables de entorno
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || "3d";

let REFRESH_COOKIE_MAX_AGE;
try {
  REFRESH_COOKIE_MAX_AGE = jwtDurationToMs(REFRESH_TOKEN_EXPIRES);
  console.log(`=> Refresh token expires: ${REFRESH_TOKEN_EXPIRES} (${REFRESH_COOKIE_MAX_AGE}ms)`);
} catch (error) {
  console.error(`Error al parsear REFRESH_TOKEN_EXPIRES: ${REFRESH_TOKEN_EXPIRES}`, error.message);
  REFRESH_COOKIE_MAX_AGE = 3 * 24 * 60 * 60 * 1000; // fallback a 3 días
}

// POST /api/auth/login
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
    // Guardar refresh token en cookie segura
    try {
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: REFRESH_COOKIE_MAX_AGE,
      });
    } catch (cookieError) {
      console.error("Error al establecer cookie:", cookieError);
    }

    return res.status(200).json({
      message: "Login exitoso",
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    console.error("Error en POST /auth/login:", error.message, error.stack);
    return res.status(500).json({ error: "Error interno: " + error.message });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token no encontrado" });
    }

    const result = await refreshTokenService(refreshToken);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    return res.status(200).json({
      message: "Token refrescado",
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error("Error en POST /auth/refresh:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken");
  return res.status(200).json({ message: "Logout exitoso" });
});

export default router;
