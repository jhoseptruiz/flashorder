"use strict";
import {
  normalizeRut,
  formatRut,
  validateRutFormat,
  validateEmail,
  validatePassword,
  ensureRutUnique,
  ensureEmailUnique,
  isRutTaken,
  isEmailTaken,
} from "../validations/users.validation.js";
import User from "../models/User.js";
import { comparePassword } from "../helpers/bcrypt.helper.js";
import {
  getAllUsersService,
  getUserByRutService,
  createUserService,
  updateUserService,
  updateOwnProfileService,
  deleteUserService,
} from "../services/users.service.js";

function toResponseUser(user) {
  return {
    ...user,
    rut: formatRut(user.rut),
  };
}

export async function getUsers(req, res) {
  try {
    const users = await getAllUsersService();
    return res.status(200).json(users.map(toResponseUser));
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function createUser(req, res) {
  try {
    const { rut, full_name, email, password, role } = req.body;

    if (!rut || !full_name || !email || !password || !role) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const normalizedRut = normalizeRut(rut);
    if (!validateRutFormat(normalizedRut)) {
      return res.status(400).json({ error: "RUT inválido" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Correo electrónico inválido" });
    }

    await ensureRutUnique(normalizedRut);
    await ensureEmailUnique(email);

    const user = await createUserService({
      rut: normalizedRut,
      full_name,
      email: String(email).trim().toLowerCase(),
      password,
      role,
    });

    return res.status(201).json(toResponseUser(user));
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return res.status(400).json({ error: error.message || "No se pudo crear el usuario" });
  }
}

export async function updateUser(req, res) {
  try {
    const currentRut = normalizeRut(req.params.rut);
    if (!validateRutFormat(currentRut)) {
      return res.status(400).json({ error: "RUT inválido" });
    }
    const { rut: newRutRaw, full_name, email, role, password } = req.body;

    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: "Correo electrónico inválido" });
    }

    if (password && !validatePassword(password)) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const newRut = newRutRaw ? normalizeRut(newRutRaw) : null;
    if (newRut && !validateRutFormat(newRut)) {
      return res.status(400).json({ error: "RUT inválido" });
    }

    if (email) {
      await ensureEmailUnique(email, currentRut);
    }

    if (newRut) {
      await ensureRutUnique(newRut, currentRut);
    }

    const user = await updateUserService(currentRut, {
      rut: newRut || undefined,
      full_name,
      email: email ? String(email).trim().toLowerCase() : undefined,
      role,
      password,
    });

    return res.status(200).json(toResponseUser(user));
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return res.status(400).json({ error: error.message || "No se pudo actualizar el usuario" });
  }
}

export async function deleteUser(req, res) {
  try {
    const currentRut = normalizeRut(req.params.rut);
    if (!validateRutFormat(currentRut)) {
      return res.status(400).json({ error: "RUT inválido" });
    }

    const result = await deleteUserService(currentRut);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return res.status(400).json({ error: error.message || "No se pudo eliminar el usuario" });
  }
}

export async function checkRutUnique(req, res) {
  try {
    const rut = normalizeRut(req.query.rut);
    const excludeRut = normalizeRut(req.query.excludeRut);

    if (!rut) {
      return res.status(400).json({ error: "RUT requerido" });
    }

    if (!validateRutFormat(rut)) {
      return res.status(400).json({ error: "RUT inválido" });
    }

    const exists = await isRutTaken(rut, excludeRut);
    return res.status(200).json({ exists });
  } catch (error) {
    console.error("Error al verificar RUT:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function checkEmailUnique(req, res) {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    const excludeRut = normalizeRut(req.query.excludeRut);

    if (!email) {
      return res.status(400).json({ error: "Correo electrónico requerido" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Correo electrónico inválido" });
    }

    const exists = await isEmailTaken(email, excludeRut);
    return res.status(200).json({ exists });
  } catch (error) {
    console.error("Error al verificar correo:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function getProfile(req, res) {
  try {
    const currentRut = normalizeRut(req.user?.rut);
    if (!validateRutFormat(currentRut)) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = await getUserByRutService(currentRut);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json(toResponseUser(user));
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function verifyProfilePassword(req, res) {
  try {
    const currentRut = normalizeRut(req.user?.rut);
    if (!validateRutFormat(currentRut)) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ error: "Contraseña actual requerida" });
    }

    const user = await User.findByPk(currentRut);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: "Contraseña actual incorrecta" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error al verificar contraseña:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function updateProfile(req, res) {
  try {
    const currentRut = normalizeRut(req.user?.rut);
    if (!validateRutFormat(currentRut)) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const { rut: newRutRaw, full_name, email, currentPassword, newPassword } = req.body;
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin && (newRutRaw || full_name || email)) {
      return res.status(403).json({ error: "Solo se puede cambiar la contraseña desde este perfil" });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: "Correo electrónico inválido" });
    }

    if (newPassword && !validatePassword(newPassword)) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });
    }

    const newRut = newRutRaw ? normalizeRut(newRutRaw) : null;
    if (newRut && !validateRutFormat(newRut)) {
      return res.status(400).json({ error: "RUT inválido" });
    }

    if (email) {
      await ensureEmailUnique(email, currentRut);
    }

    if (newRut) {
      await ensureRutUnique(newRut, currentRut);
    }

    const updatedUser = await updateOwnProfileService(
      currentRut,
      {
        rut: newRut || undefined,
        full_name,
        email: email ? String(email).trim().toLowerCase() : undefined,
        password: newPassword,
      },
      currentPassword,
      isAdmin
    );

    return res.status(200).json(toResponseUser(updatedUser));
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    const status = error.message.includes("contraseña") || error.message.includes("Solo se puede") ? 400 : 400;
    return res.status(status).json({ error: error.message || "No se pudo actualizar el perfil" });
  }
}
