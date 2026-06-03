"use strict";
import { Op } from "sequelize";
import User from "../models/User.js";
import { hashPassword } from "../helpers/bcrypt.helper.js";

const ALLOWED_ROLES = ["empleado", "cocinero"];

function formatUserRecord(user) {
  return {
    rut: user.rut,
    full_name: user.fullName ?? user.full_name,
    email: user.email,
    role: user.role,
    is_active: user.isActive ?? user.is_active,
  };
}

export async function getAllUsersService() {
  const users = await User.findAll({
    where: { isActive: true },
    order: [["fullName", "ASC"]],
    attributes: ["rut", "fullName", "email", "role", "isActive"],
    raw: true,
  });

  return users.map(formatUserRecord);
}

export async function createUserService({ rut, full_name, email, password, role }) {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("El rol debe ser empleado o cocinero");
  }

  const existing = await User.findOne({
    where: {
      [Op.or]: [{ rut }, { email }],
    },
  });

  if (existing) {
    if (existing.rut === rut) {
      throw new Error("Ya existe un usuario con ese RUT");
    }
    throw new Error("Ya existe un usuario con ese correo");
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    rut,
    fullName: full_name,
    email,
    passwordHash,
    role,
    isActive: true,
  });

  return formatUserRecord(user.get({ plain: true }));
}

export async function updateUserService(rut, updates) {
  const allowedFields = ["full_name", "email", "role"];
  const updateData = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null) continue;
    if (key === "password") continue;
    if (key === "rut") {
      updateData["rut"] = value;
      continue;
    }
    if (!allowedFields.includes(key)) continue;
    if (key === "role" && !ALLOWED_ROLES.includes(value)) {
      throw new Error("El rol debe ser empleado o cocinero");
    }
    updateData[key === "full_name" ? "fullName" : key] = value;
  }

  const hasPassword = typeof updates.password === "string" && updates.password.length > 0;

  if (Object.keys(updateData).length === 0 && !hasPassword) {
    throw new Error("No hay campos válidos para actualizar");
  }

  let user = await User.findByPk(rut);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (updateData.rut && updateData.rut !== user.rut) {
    await User.update(
      { rut: updateData.rut },
      { where: { rut: user.rut }, returning: true }
    );
    user = await User.findByPk(updateData.rut);
    delete updateData.rut;
  }

  if (Object.keys(updateData).length > 0) {
    await user.update(updateData);
    await user.reload();
  }

  if (hasPassword) {
    const passwordHash = await hashPassword(updates.password);
    await user.update({ passwordHash });
    await user.reload();
  }

  return formatUserRecord(user.get({ plain: true }));
}

export async function deleteUserService(rut) {
  const user = await User.findOne({ where: { rut } });
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  await user.destroy();
  return { rut };
}
