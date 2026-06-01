"use strict";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "../config/configEnv.js";

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

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}