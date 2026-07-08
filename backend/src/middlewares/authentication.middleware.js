"use strict";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "../config/configEnv.js";
import User from "../models/User.js";

const ACCESS_SECRET = new TextEncoder().encode(JWT_SECRET);

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ error: "Token de acceso requerido" });
    }

    const { payload } = await jwtVerify(token, ACCESS_SECRET, {
      algorithms: ["HS256"],
    });

    // Validar en la BD que el usuario siga existiendo y esté activo
    const user = await User.findOne({
      where: { rut: payload.rut, isActive: true },
      attributes: ["rut", "role", "isActive"]
    });

    if (!user) {
      return res.status(401).json({ error: "Usuario inactivo o no encontrado" });
    }

    req.user = { rut: user.rut, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}