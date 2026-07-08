import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/apiFetch";
import { useAuth } from "./AuthContext";

const CashRegisterContext = createContext();

export function CashRegisterProvider({ children }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derivar saldo actual
  const currentCash = activeSession?.currentCash ?? 0;

  // ── Cargar sesión activa ─────────────────────────────────────────────────
  const refreshSession = useCallback(async () => {
    if (!user || (user.role !== "admin" && user.role !== "empleado")) {
      setActiveSession(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch("/api/cash-register/session/active");
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data); // null si no hay sesión activa
      } else {
        setActiveSession(null);
      }
    } catch (e) {
      console.error("Error cargando sesión de caja:", e);
      setActiveSession(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // ── Abrir caja ──────────────────────────────────────────────────────────
  const openRegister = useCallback(async (openingCash) => {
    const res = await apiFetch("/api/cash-register/open", {
      method: "POST",
      body: JSON.stringify({ openingCash }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo abrir la caja");

    setActiveSession(data);
    return data;
  }, []);

  // ── Cerrar caja ─────────────────────────────────────────────────────────
  const closeRegister = useCallback(async (closingCash, notes) => {
    if (!activeSession) throw new Error("No hay sesión activa para cerrar");

    const res = await apiFetch("/api/cash-register/close", {
      method: "POST",
      body: JSON.stringify({
        sessionId: activeSession.id,
        closingCash,
        notes,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo cerrar la caja");

    setActiveSession(null);
    return data;
  }, [activeSession]);

  return (
    <CashRegisterContext.Provider
      value={{
        activeSession,
        loading,
        currentCash,
        openRegister,
        closeRegister,
        refreshSession,
      }}
    >
      {children}
    </CashRegisterContext.Provider>
  );
}

export function useCashRegister() {
  return useContext(CashRegisterContext);
}
