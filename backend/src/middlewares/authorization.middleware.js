"use strict";
/**
 * Middleware para autorizar acceso basado en roles.
 * Debe usarse SIEMPRE después del middleware `authenticate`.
 * 
 * @param {...string} allowedRoles - Lista de roles permitidos (ej. 'admin', 'empleado')
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Usuario no autenticado o rol no definido" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permisos suficientes para acceder a este recurso" });
    }

    next();
  };
}
