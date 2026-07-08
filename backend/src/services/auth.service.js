"use strict";
import { SignJWT, jwtVerify } from "jose";
import User from "../models/User.js";
import { comparePassword } from "../helpers/bcrypt.helper.js";
import { JWT_SECRET } from "../config/configEnv.js";

// jose requiere la clave como Uint8Array
const ACCESS_SECRET  = new TextEncoder().encode(JWT_SECRET);
const ACCESS_EXPIRES  = process.env.ACCESS_TOKEN_EXPIRES || "1d";

export async function generateToken(payload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(ACCESS_SECRET);

  return token;
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
    const token = await generateToken(payload);

    //Formatear el usuario para omitir el hash
    const userData = user.toJSON();
    delete userData.passwordHash;

    return { token, user: userData };
  }catch (error) {
    console.error("[loginService]", error, error.message, error.stack);
    return { error: "Error interno del servidor", status: 500 };
  }
}