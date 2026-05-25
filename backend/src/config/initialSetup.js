"use strict";
import pool from "../db/db.js";
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
      // Si ya existe el RUT, omite
      const { rows } = await pool.query(
        "SELECT rut FROM users WHERE rut = $1",
        [u.rut]
      );

      if (rows.length > 0) {
        console.log(`=> Usuario ${u.role} ya existe, omitiendo...`);
        continue;
      }

      const passwordHash = await hashPassword(u.password);

      await pool.query(
        `INSERT INTO users (rut, full_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [u.rut, u.full_name, u.email, passwordHash, u.role, true]
      );

      console.log(`=> Usuario creado: ${u.email} (${u.role})`);
    }
  } catch (error) {
    console.error("Error en createInitialUsers:", error);
  }
}