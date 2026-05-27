"use strict";
import User from "../models/User.js";
import { hashPassword } from "../helpers/bcrypt.helper.js";

const DEFAULT_USERS = [
  {
    rut:       "11111111-1",
    full_name: "Administrador",
    email:     "admin@flashorder.cl",
    password:  "admin1234",
    role:      "admin",
  },
  {
    rut:       "22222222-2",
    full_name: "Empleado1",
    email:     "empleado@flashorder.cl",
    password:  "empleado1234",
    role:      "empleado",
  },
  {
    rut:       "33333333-3",
    full_name: "Cocinero1",
    email:     "cocinero@flashorder.cl",
    password:  "cocinero1234",
    role:      "cocinero",
  },
];

export async function createInitialUsers() {
  try {
    for (const u of DEFAULT_USERS) {
      // findOrCreate busca si existe, y si no, lo inserta
      const [user, created] = await User.findOrCreate({
        where: { rut: u.rut },
        defaults: {
          fullName: u.full_name, // Mapeamos del array viejo al nuevo nombre camelCase
          email: u.email,
          passwordHash: await hashPassword(u.password),
          role: u.role,
          isActive: true
        }
      });

      if (created) {
        console.log(`=> Usuario creado: ${u.email} (${u.role})`);
      }
    }
  } catch (error) {
    console.error("Error en createInitialUsers:", error);
  }
}