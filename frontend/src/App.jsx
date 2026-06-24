import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { CashRegisterProvider } from "./context/CashRegisterContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Config from "./pages/Config";
import Home from "./pages/Home";
import Usuarios from "./pages/Usuarios";
import Cocina from "./pages/Cocina";
import Catalogo from "./pages/Catalogo";
import Pedidos from "./pages/Pedidos";
import Perfil from "./pages/Perfil";
import POS from "./pages/POS";
import Auditoria from "./pages/Auditoria";
import Invoices from "./pages/Invoices";
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
            <Route path="/dashboard" element={<Home />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/invoices" element={<Invoices />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin", "cocinero"]} />}>
            <Route path="/kitchen" element={<Cocina />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin", "empleado", "cocinero"]} />}>
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/orders" element={<Pedidos />} />
            <Route path="/auditoria" element={<Auditoria />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/catalogo" element={<Catalogo/>}/>
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
        <CashRegisterProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </CashRegisterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}