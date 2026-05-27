"use strict";
import { SignJWT, jwtVerify } from "jose";
import User from "../models/User.js";
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
    // Buscamos el usuario usando sequelize
    const user = await User.findOne({
      where:{ email: email, isActive: true }
    });

    if(!user){
      return { error: "Usuario no encontrado o inactivo", status: 401 };
    }

    // Verificamos constraseña 
    const valid = await comparePassword(password, user.passwordHash);
    if(!valid){
      return { error: "Contraseña incorrecta", status: 401 };
    }

    const payload = { rut: user.rut, role: user.role };
    const { accessToken, refreshToken } = await generateTokens(payload);

    //Formatear el usuario para omitir el hash
    const userData = user.toJSON();
    delete userData.passwordHash;

    return { accessToken, refreshToken, user: userData };
  }catch (error) {
    console.error("[loginService]", error, error.message, error.stack);
    return { error: "Error interno del servidor", status: 500 };
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