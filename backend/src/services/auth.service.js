"use strict";
import { SignJWT, jwtVerify } from "jose";
import pool from "../db/db.js";
import { comparePassword } from "../helpers/bcrypt.helper.js";
import { JWT_SECRET } from "../config/configEnv.js";

// jose requiere la clave como Uint8Array
const ACCESS_SECRET  = new TextEncoder().encode(JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(JWT_SECRET + "_refresh");
const ACCESS_EXPIRES  = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || "3d";

async function generateTokens(payload) {
  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(ACCESS_SECRET);

  const refreshToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRES)
    .sign(REFRESH_SECRET);

  return { accessToken, refreshToken };
}

export async function loginService(email, password) {
  try {
    console.log(`   [loginService] Buscando usuario: ${email}`);
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_active = TRUE",
      [email]
    );

    console.log(`   [loginService] Usuarios encontrados: ${rows.length}`);
    if (rows.length === 0) {
      console.log(`   [loginService] Usuario no encontrado: ${email}`);
      return { error: "Email o contraseña incorrectos", status: 401 };
    }

    const user = rows[0];
    console.log(`   [loginService] Usuario encontrado: ${user.email}`);

    console.log(`   [loginService] Comparando contraseñas...`);
    const valid = await comparePassword(password, user.password_hash);
    console.log(`   [loginService] Contraseña válida: ${valid}`);
    
    if (!valid) {
      console.log(`   [loginService] Contraseña incorrecta para: ${email}`);
      return { error: "Email o contraseña incorrectos", status: 401 };
    }

    console.log(`   [loginService] Generando tokens para: ${email}`);
    const payload = {
      rut:  user.rut,
      role: user.role,
    };

    const { accessToken, refreshToken } = await generateTokens(payload);

    delete user.password_hash;

    console.log(`   [loginService] Login exitoso para: ${email}`);
    return { accessToken, refreshToken, user };
  } catch (error) {
    console.error("[loginService] Error:", error.message, error.stack);
    return { error: "Error interno", status: 500 };
  }
}

export async function refreshTokenService(token) {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET, {
      algorithms: ["HS256"],
    });

    const newPayload = { rut: payload.rut, role: payload.role };
    const { accessToken, refreshToken } = await generateTokens(newPayload);

    return { accessToken, refreshToken };
  } catch {
    return { error: "Refresh token inválido o expirado", status: 401 };
  }
}