import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function Login({ onLogin }) {
  const { primary, appName, appLogo } = useTheme();
  const [email,    setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]   = useState("");
  const [loading,  setLoading] = useState(false);

  // URL de la API (desde variable de entorno o fallback local)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Completa todos los campos"); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      
      if (!text) {
        setError("Respuesta vacía del servidor");
        setLoading(false);
        return;
      }

      const data = JSON.parse(text);

      if (!response.ok) {
        setError(data.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      // Guardar token en localStorage
      localStorage.setItem("accessToken", data.accessToken);

      const normalizedUser = {
        ...data.user,
        name: data.user.full_name || data.user.name || data.user.email,
        id: data.user.rut || data.user.id,
      };

      // Pasar los datos del usuario al componente padre
      onLogin(normalizedUser);
    } catch (err) {
      console.error("Error en login:", err);
      setError("Error de conexión con el servidor: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "fadein 0.4s ease" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: primary, marginBottom: 16, overflow: "hidden" }}>
            {appLogo ? (
              <img src={appLogo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <i className="ti ti-bolt" style={{ fontSize: 26, color: "#fff" }} />
            )}
          </div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px" }}>
            {appName}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
            Sistema de gestión para tu pastelería
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>Iniciar sesión</h2>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)", display: "block", marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="usuario@flashorder.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)", display: "block", marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 16 }} />
                {error}
              </div>
            )}

            <button className="btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
              {loading ? (
                <><i className="ti ti-loader" style={{ fontSize: 18, animation: "spin 1s linear infinite" }} />Verificando...</>
              ) : (
                <><i className="ti ti-login" style={{ fontSize: 18 }} />Ingresar al sistema</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}