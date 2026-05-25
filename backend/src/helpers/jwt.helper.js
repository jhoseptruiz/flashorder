"use strict";

/**
 * Convierte una duración JWT (ej: "3d", "15m", "7d") a milisegundos
 * @param {string} duration - Duración en formato JWT (ej: "3d", "15m")
 * @returns {number} Duración en milisegundos
 * @throws {Error} Si el formato no es válido
 */
export function jwtDurationToMs(duration) {
  if (!duration || typeof duration !== "string") {
    throw new Error(`Duration debe ser un string válido, recibió: ${typeof duration}`);
  }

  const units = {
    s: 1000,           // segundos
    m: 60 * 1000,      // minutos
    h: 60 * 60 * 1000, // horas
    d: 24 * 60 * 60 * 1000, // días
  };

  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(`Formato de duración inválido: "${duration}". Usa: 1s, 15m, 1h, 3d`);
  }

  const [, value, unit] = match;
  const unitMs = units[unit.toLowerCase()];
  
  if (!unitMs) {
    throw new Error(`Unidad de tiempo no reconocida: ${unit}`);
  }

  return parseInt(value, 10) * unitMs;
}
