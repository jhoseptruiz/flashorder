"use strict";
import { AuditLog, User } from "../models/index.models.js";

/**
 * GET /api/audit-logs
 *
 * - Admin: ve TODOS los registros de auditoría.
 * - Empleado / Cocinero: solo ve sus propios registros.
 */
export async function getAuditLogs(req, res) {
  try {
    const { role, rut } = req.user;

    const whereClause = role === "admin" ? {} : { userRut: rut };

    const logs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ["fullName", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 500,
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error en getAuditLogs:", error);
    return res.status(500).json({ error: "Error al obtener los registros de auditoría" });
  }
}
