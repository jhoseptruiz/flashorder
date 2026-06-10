import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Avisar al backend para que registre la auditoría y limpie la cookie
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`${API_URL}/api/auth/logout`, {
        method:      "POST",
        credentials: "include",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
    } catch {
      // Si falla la petición, continuamos limpiando igualmente
    }

    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  }, []);

  // ── Escuchar evento de sesión expirada (disparado por apiFetch) ───────────
  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      // La redirección al login la maneja ProtectedRoute al detectar user=null
    };

    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, []);

  // ── Inicialización: leer sesión persistida ────────────────────────────────
  useEffect(() => {
    const token      = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
      }
    }
    setLoading(false);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
