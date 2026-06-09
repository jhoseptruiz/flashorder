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
import {
  getAllUsersService,
  createUserService,
  updateUserService,
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
