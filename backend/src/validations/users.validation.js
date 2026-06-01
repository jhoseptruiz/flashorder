"use strict";
import { Op } from "sequelize";
import sequelize from "../db/db.js";
import User from "../models/User.js";

const RUT_REGEX = /^[0-9]+[0-9kK]?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeRut(raw) {
	return String(raw || "").replace(/[\.\-]/g, "").trim().toUpperCase();
}

export function validateRutFormat(raw) {
	const value = normalizeRut(raw);
	return RUT_REGEX.test(value) && value.length >= 8 && value.length <= 10;
}

export function formatRut(raw) {
	const value = normalizeRut(raw);
	if (value.length <= 1) return value;

	const dv = value.slice(-1);
	let body = value.slice(0, -1);
	const parts = [];

	while (body.length > 3) {
		parts.unshift(body.slice(-3));
		body = body.slice(0, -3);
	}

	if (body) {
		parts.unshift(body);
	}

	return `${parts.join(".")}-${dv}`;
}

export function validateEmail(value) {
	return EMAIL_REGEX.test(String(value || "").trim().toLowerCase());
}

export async function isRutTaken(rut, excludeRut = null) {
	if (!rut) return false;

	const where = excludeRut
		? { [Op.and]: [{ rut }, { rut: { [Op.ne]: excludeRut } }] }
		: { rut };

	const user = await User.findOne({ where });
	return Boolean(user);
}

export async function isEmailTaken(email, excludeRut = null) {
	const normalizedEmail = String(email || "").trim().toLowerCase();
	if (!normalizedEmail) return false;

	const conditions = [sequelize.where(sequelize.fn("lower", sequelize.col("email")), normalizedEmail)];
	if (excludeRut) {
		conditions.push({ rut: { [Op.ne]: excludeRut } });
	}

	const user = await User.findOne({ where: { [Op.and]: conditions } });
	return Boolean(user);
}

export async function ensureRutUnique(rut, excludeRut = null) {
	if (await isRutTaken(rut, excludeRut)) {
		throw new Error("Ya existe un usuario con ese RUT");
	}
}

export async function ensureEmailUnique(email, excludeRut = null) {
	if (await isEmailTaken(email, excludeRut)) {
		throw new Error("Ya existe un usuario con ese correo");
	}
}

export function validatePassword(password) {
	return typeof password === "string" && password.trim().length >= 8;
}

