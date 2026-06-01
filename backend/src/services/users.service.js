"use strict";
import User from "../models/User.js";
import { hashPassword } from "../helpers/bcrypt.helper.js";

const ALLOWED_ROLES = ["empleado", "cocinero"];

export async function getAllUsersService() {
  const users = await User.findAll({
    where: { isActive: true },
    attributes: ["rut", "fullName", "email", "role", "isActive"],
    order: [["fullName", "ASC"]],
  });

  return users;
}

export async function createUserService({ rut, full_name, email, password, role }) {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("El rol debe ser empleado o cocinero");
  }

  // Verificar si ya existe un usuario con ese RUT o email
  const existingByRut = await User.findOne({ where: { rut } });
  if (existingByRut) {
    throw new Error("Ya existe un usuario con ese RUT");
  }

  const existingByEmail = await User.findOne({ where: { email } });
  if (existingByEmail) {
    throw new Error("Ya existe un usuario con ese correo");
  }

  const passwordHash = await hashPassword(password);

  const newUser = await User.create({
    rut,
    fullName: full_name,
    email,
    passwordHash,
    role,
    isActive: true,
  });

  // Devolver sin el hash
  const userData = newUser.toJSON();
  delete userData.passwordHash;
  return userData;
}

export async function updateUserService(rut, updates) {
  const user = await User.findOne({ where: { rut } });
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Solo actualizar campos permitidos
  if (updates.full_name) user.fullName = updates.full_name;
  if (updates.email) user.email = updates.email;
  if (updates.role) {
    if (!ALLOWED_ROLES.includes(updates.role)) {
      throw new Error("El rol debe ser empleado o cocinero");
    }
    user.role = updates.role;
  }

  await user.save();

  const userData = user.toJSON();
  delete userData.passwordHash;
  return userData;
}

export async function deleteUserService(rut) {
  const user = await User.findOne({ where: { rut } });
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  await user.destroy();
  return { rut };
}
