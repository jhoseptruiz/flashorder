import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center" }}>Verificando sesión...</div>;
  }

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si se definieron roles permitidos y el rol del usuario no está incluido
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirigir al inicio correspondiente a su rol o al general si no se reconoce
    const roleRedirects = {
      admin: "/dashboard",
      empleado: "/pos",
      cocinero: "/kitchen"
    };
    return <Navigate to={roleRedirects[user.role] || "/dashboard"} replace />;
  }

  // Si pasa las validaciones, renderizar las rutas hijas
  return <Outlet />;
}
