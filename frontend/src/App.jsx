import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Config from "./pages/Config";
import Home from "./pages/Home";
import Usuarios from "./pages/Usuarios";
import "./styles/global.css";

function AppContent() {
  const { dark, primary, primaryLight, toast } = useTheme();

  const cssVars = {
    "--primary": primary,
    "--primary-light": primaryLight,
  };

  return (
    <div
      className={dark ? "dark-mode" : "light-mode"}
      style={{ ...cssVars, minHeight: "100vh" }}
    >
      {toast && (
        <div className={`toast toast--${toast.type}`}>
          <i className={`ti ${toast.type === "success" ? "ti-circle-check" : "ti-circle-x"}`} />
          {toast.msg}
        </div>
      )}

      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />

        {/* Rutas Privadas envueltas en Layout */}
        <Route element={<Layout />}>
          {/* Default redirect (será interceptado por ProtectedRoute si no hay sesión, 
              o bien redirigirá según el rol al dashboard, etc.) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route element={<ProtectedRoute allowedRoles={["admin", "empleado"]} />}>
            <Route path="/dashboard" element={<Home navKey="dashboard" />} />
            <Route path="/pos" element={<Home navKey="pos" />} />
            <Route path="/invoices" element={<Home navKey="invoices" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin", "cocinero"]} />}>
            <Route path="/kitchen" element={<Home navKey="kitchen" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin", "empleado", "cocinero"]} />}>
            <Route path="/orders" element={<Home navKey="orders" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/config" element={<Config />} />
          </Route>
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}