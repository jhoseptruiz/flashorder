"use strict";
import pool from "../db/db.js";
import { hashPassword } from "../helpers/bcrypt.helper.js";

const ALLOWED_ROLES = ["empleado", "cocinero"];

export async function getAllUsersService() {
  const { rows } = await pool.query(
    `SELECT rut, full_name, email, role, is_active
     FROM users
     WHERE is_active = TRUE
     ORDER BY full_name ASC`
  );

  return rows;
}

export async function createUserService({ rut, full_name, email, password, role }) {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("El rol debe ser empleado o cocinero");
  }

  const existing = await pool.query(
    `SELECT rut, email FROM users WHERE rut = $1 OR email = $2`,
    [rut, email]
  );

  if (existing.rows.length > 0) {
    const conflict = existing.rows[0];
    if (conflict.rut === rut) {
      throw new Error("Ya existe un usuario con ese RUT");
    }
    throw new Error("Ya existe un usuario con ese correo");
  }

  const passwordHash = await hashPassword(password);

  await pool.query(
    `INSERT INTO users (rut, full_name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [rut, full_name, email, passwordHash, role]
  );

  return {
    rut,
    full_name,
    email,
    role,
    is_active: true,
  };
}

export async function updateUserService(rut, updates) {
  const allowedFields = ["full_name", "email", "role"];
  const values = [];
  const assignments = [];

  for (const [key, value] of Object.entries(updates)) {
    if (!allowedFields.includes(key)) continue;
    if (key === "role" && !ALLOWED_ROLES.includes(value)) {
      throw new Error("El rol debe ser empleado o cocinero");
    }
    values.push(value);
    assignments.push(`${key} = $${values.length}`);
  }

  if (assignments.length === 0) {
    throw new Error("No hay campos válidos para actualizar");
  }

  values.push(rut);

  const { rows } = await pool.query(
    `UPDATE users
     SET ${assignments.join(", ")}
     WHERE rut = $${values.length}
     RETURNING rut, full_name, email, role, is_active`,
    values
  );

  if (rows.length === 0) {
    throw new Error("Usuario no encontrado");
  }

  return rows[0];
}

export async function deleteUserService(rut) {
  const { rowCount } = await pool.query(`DELETE FROM users WHERE rut = $1`, [rut]);

  if (rowCount === 0) {
    throw new Error("Usuario no encontrado");
  }

  return { rut };
}
