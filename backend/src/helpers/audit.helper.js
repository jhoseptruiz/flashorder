import AuditLog from "../models/AuditLog.js";

/**
 * Registra una entrada en el log de auditoría.
 *
 * @param {string} userRut    - RUT del usuario que realiza la acción
 * @param {string} action     - Descripción de la acción (ej. "CREATE", "UPDATE_STATUS", "LOGIN")
 * @param {string} tableAffected - Tabla afectada (ej. "customer_orders", "users")
 * @param {string|null} recordId - ID del registro afectado (UUID o null)
 * @param {object|null} oldData  - Datos anteriores al cambio (snapshot)
 * @param {object|null} newData  - Datos nuevos después del cambio (snapshot)
 */
export async function createAuditLog(userRut, action, tableAffected, recordId = null, oldData = null, newData = null) {
  try {
    await AuditLog.create({
      userRut,
      action,
      tableAffected,
      recordId,
      oldData,
      newData,
      createdAt: new Date(),
    });
  } catch (error) {
    // No lanzamos el error para no interrumpir la operación principal
    console.error("[AuditLog] Error al registrar auditoría:", error.message);
  }
}
