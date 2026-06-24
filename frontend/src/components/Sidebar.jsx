import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useCashRegister } from "../context/CashRegisterContext";

export const NAV = [
  { icon: "ti-layout-dashboard", label: "Dashboard",           key: "dashboard", roles: ["admin", "empleado"] },
  { icon: "ti-shopping-cart",    label: "Punto de Venta",      key: "pos",       roles: ["admin", "empleado"] },
  { icon: "ti-chef-hat",         label: "Cocina",              key: "kitchen",   roles: ["admin", "cocinero"] },
  { icon: "ti-calendar",         label: "Pedidos y Calendario", key: "orders",    roles: ["admin", "empleado", "cocinero"] },
  { icon: "ti-category",         label: "Catálogo de Menú",    key: "catalogo",  roles: ["admin"] },
  { icon: "ti-receipt",          label: "Boletas y Facturas",  key: "invoices",  roles: ["admin", "empleado"] },
  { icon: "ti-users",            label: "Usuarios",            key: "usuarios",  roles: ["admin"] },
  { icon: "ti-user",             label: "Perfil",              key: "perfil",     roles: ["admin", "empleado", "cocinero"] },
  { icon: "ti-clipboard-list",   label: "Auditoría",           key: "auditoria",  roles: ["admin", "empleado", "cocinero"] },
  { icon: "ti-settings",         label: "Configuración",       key: "config",    roles: ["admin"] },
];

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CL")}`;

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { primary, appName, appLogo, showToast } = useTheme();
  const { user, logout } = useAuth();
  const { activeSession, currentCash, openRegister, closeRegister, refreshSession } = useCashRegister();
  const location = useLocation();

  // ── Estado modales de caja ──────────────────────────────────────────────
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [closingCashInput, setClosingCashInput] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closeResult, setCloseResult] = useState(null);
  const [pendingLogout, setPendingLogout] = useState(false);

  const showCashRegister = user?.role === "admin" || user?.role === "empleado";
  const isOpen_ = !!activeSession;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleOpen = async () => {
    const amount = parseInt(openingCashInput) || 0;
    if (amount < 0) { showToast("El monto no puede ser negativo", "error"); return; }
    setSubmitting(true);
    try {
      await openRegister(amount);
      showToast("¡Caja abierta correctamente!", "success");
      setShowOpenModal(false);
      setOpeningCashInput("");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    const amount = parseInt(closingCashInput);
    if (isNaN(amount) || amount < 0) { showToast("Ingresa un monto válido", "error"); return; }
    setSubmitting(true);
    try {
      const result = await closeRegister(amount, closeNotes);
      setCloseResult(result);
      const diff = result.difference || 0;
      if (diff === 0) {
        showToast("¡Caja cerrada correctamente! Cuadre perfecto.", "success");
      } else if (diff > 0) {
        showToast(`Caja cerrada. Sobrante de ${fmt(diff)}`, "success");
      } else {
        showToast(`Caja cerrada. Faltante de ${fmt(Math.abs(diff))}`, "error");
      }
    } catch (e) {
      showToast(e.message, "error");
      setSubmitting(false);
    }
  };

  // ── Interceptar logout si la caja está abierta ─────────────────────────
  const handleLogoutClick = () => {
    if (showCashRegister && isOpen_) {
      showToast("Debes cerrar la caja antes de cerrar sesión", "error");
      setPendingLogout(true);
      setShowCloseModal(true);
      return;
    }
    logout();
  };

  const expectedCash = currentCash;
  const closingDiff = closingCashInput !== "" ? (parseInt(closingCashInput) || 0) - expectedCash : null;

  return (
    <>
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`} style={ {
        width: 220,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px", marginBottom: 28 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}>
            {appLogo ? (
              <img src={appLogo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <i className="ti ti-bolt" style={{ fontSize: 18, color: "#fff" }} />
            )}
          </div>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {appName}
          </span>
          <button
            type="button"
            className="sidebar-close-button"
            onClick={onClose}
            aria-label="Cerrar panel"
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              color: "var(--text2)",
              cursor: "pointer",
              display: "none",
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.filter(n => !n.roles || n.roles.includes(user?.role)).map((n) => {
            const path = `/${n.key}`;
            const isActive = location.pathname.startsWith(path);
            return (
              <Link
                key={n.key}
                to={path}
                className={`nav-item${isActive ? " active" : ""}`}
                style={{ textDecoration: "none" }}
              >
                <i className={`ti ${n.icon}`} style={{ fontSize: 18 }} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Tarjeta estado de caja ── */}
        {showCashRegister && (
          <div
            style={{
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 10,
              background: isOpen_
                ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                : "linear-gradient(135deg, #dc2626 0%, #f97316 100%)",
              color: "#fff",
              transition: "all 0.3s ease",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={() => {
              if (isOpen_) setShowCloseModal(true);
              else setShowOpenModal(true);
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {/* Subtle pattern overlay */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <i className={`ti ${isOpen_ ? "ti-cash-register" : "ti-lock"}`} style={{ fontSize: 18 }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {isOpen_ ? "Caja Abierta" : "Caja Cerrada"}
                </span>
              </div>
              {isOpen_ ? (
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.5px" }}>
                  {fmt(currentCash)}
                </div>
              ) : (
                <div style={{ fontSize: 11, opacity: 0.9 }}>
                  Toca para abrir la caja
                </div>
              )}
            </div>
          </div>
        )}

        {/* Usuario */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: primary, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 14, fontWeight: 600,
              color: "#fff", flexShrink: 0,
            }}>
              {(user?.name || user?.full_name || user?.email || "U")?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.name || user?.full_name || user?.email || "Usuario"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text2)" }}>{user?.role}</div>
            </div>
          </div>
          <button className="nav-item danger" onClick={handleLogoutClick}>
            <i className="ti ti-logout" style={{ fontSize: 18 }} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ═══ MODAL ABRIR CAJA ═══ */}
      {showOpenModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.54)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 100, padding: 20,
            animation: "fadein 0.2s ease",
          }}
          onClick={() => setShowOpenModal(false)}
        >
          <div
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: 28, width: "min(420px, 100%)",
              boxShadow: "0 28px 80px rgba(15, 23, 42, 0.32)", position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowOpenModal(false)} style={{ position: "absolute", top: 14, right: 14, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 999, width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <i className="ti ti-x" />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #059669, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-cash-register" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0, fontFamily: "Syne, sans-serif" }}>Abrir Caja</h2>
                <p style={{ fontSize: 12, color: "var(--text2)", margin: 0 }}>Ingresa el efectivo inicial</p>
              </div>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)", marginBottom: 20 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>Efectivo inicial en caja:</span>
              <input
                className="input-field"
                type="number"
                placeholder="$ 0"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                min="0"
                autoFocus
                style={{ fontSize: 18, fontWeight: 700, padding: "12px 14px" }}
              />
            </label>

            <button
              disabled={submitting}
              onClick={handleOpen}
              style={{
                background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", border: "none",
                borderRadius: 10, padding: "14px 20px", fontWeight: 700, fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
                fontFamily: "'DM Sans', sans-serif", width: "100%", transition: "all 0.2s",
              }}
            >
              {submitting ? "Abriendo..." : "Abrir Caja"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ MODAL CERRAR CAJA ═══ */}
      {showCloseModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.54)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 100, padding: 20,
            animation: "fadein 0.2s ease",
          }}
          onClick={() => {
            if (!closeResult) {
              setShowCloseModal(false);
              setPendingLogout(false);
            }
          }}
        >
          <div
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: 28, width: "min(480px, 100%)",
              boxShadow: "0 28px 80px rgba(15, 23, 42, 0.32)", position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {closeResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #059669, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="ti ti-circle-check" style={{ fontSize: 22, color: "#fff" }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0, fontFamily: "Syne, sans-serif" }}>Cierre Exitoso</h2>
                    <p style={{ fontSize: 12, color: "var(--text2)", margin: 0 }}>La sesión de caja ha sido cerrada.</p>
                  </div>
                </div>

                {/* Contenido del Ticket imprimible */}
                <div id="printable-shift-ticket" style={{
                  background: "var(--bg)", 
                  padding: "20px 24px", 
                  borderRadius: 12, 
                  border: "1px solid var(--border)",
                  fontFamily: "'DM Mono', 'Fira Code', monospace",
                  fontSize: 13,
                  color: "var(--text)"
                }}>
                  <div style={{ textAlign: "center", marginBottom: 16, fontFamily: "Syne, sans-serif" }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{appName || "FlashOrder"}</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text2)" }}>RESUMEN DE CIERRE DE CAJA</p>
                  </div>

                  <div style={{ borderTop: "1px dashed var(--border)", borderBottom: "1px dashed var(--border)", padding: "10px 0", marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Monto Inicial:</span>
                      <strong>{fmt(closeResult.openingCash)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Efectivo Esperado:</span>
                      <strong>{fmt(closeResult.expectedCash)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Efectivo Contado (Real):</span>
                      <strong>{fmt(closeResult.closingCash)}</strong>
                    </div>
                    
                    {/* Diferencia */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: "1px solid var(--border)",
                      fontWeight: 700,
                      color: (closeResult.difference || 0) === 0 ? "#15803d" : (closeResult.difference || 0) > 0 ? "#1d4ed8" : "#dc2626"
                    }}>
                      <span>Diferencia:</span>
                      <span>
                        {(closeResult.difference || 0) === 0 ? "✓ Cuadre" : (closeResult.difference || 0) > 0 ? `+${fmt(closeResult.difference)}` : fmt(closeResult.difference)}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, color: "var(--text2)", marginBottom: 8, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Desglose de Ventas del Turno
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Efectivo:</span>
                      <span>{fmt(closeResult.breakdown?.efectivo)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Transferencia:</span>
                      <span>{fmt(closeResult.breakdown?.transferencia)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Tarjeta:</span>
                      <span>{fmt(closeResult.breakdown?.tarjeta)}</span>
                    </div>
                    <div style={{ 
                      borderTop: "1px solid var(--border)", 
                      paddingTop: 6, 
                      marginTop: 6,
                      display: "flex", 
                      justifyContent: "space-between",
                      fontWeight: 700
                    }}>
                      <span>Total Ventas:</span>
                      <span style={{ color: primary }}>{fmt(closeResult.breakdown?.totalSales)}</span>
                    </div>
                  </div>

                  {closeResult.notes && (
                    <div style={{ fontSize: 11, color: "var(--text2)", fontStyle: "italic", borderTop: "1px dashed var(--border)", paddingTop: 8 }}>
                      Obs: {closeResult.notes}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank', 'width=600,height=600');
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Resumen de Cierre de Caja</title>
                            <style>
                              body { font-family: monospace; padding: 20px; color: #000; }
                              div { line-height: 1.4; }
                              hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
                              .title { text-align: center; margin-bottom: 20px; }
                              .flex { display: flex; justify-content: space-between; }
                              .bold { font-weight: bold; }
                            </style>
                          </head>
                          <body>
                            <div class="title">
                              <h3>${appName || "FlashOrder"}</h3>
                              <p>RESUMEN DE CIERRE DE CAJA</p>
                            </div>
                            <hr />
                            <div class="flex"><span>Monto Inicial:</span> <span class="bold">${fmt(closeResult.openingCash)}</span></div>
                            <div class="flex"><span>Efectivo Esperado:</span> <span class="bold">${fmt(closeResult.expectedCash)}</span></div>
                            <div class="flex"><span>Efectivo Contado (Real):</span> <span class="bold">${fmt(closeResult.closingCash)}</span></div>
                            <hr />
                            <div class="flex bold">
                              <span>Diferencia:</span>
                              <span>${(closeResult.difference || 0) === 0 ? "Cuadre" : (closeResult.difference || 0) > 0 ? `+${fmt(closeResult.difference)}` : fmt(closeResult.difference)}</span>
                            </div>
                            <hr />
                            <div class="bold" style="margin-bottom: 5px;">DESGLOSE VENTAS DEL TURNO:</div>
                            <div class="flex"><span>Efectivo:</span> <span>${fmt(closeResult.breakdown?.efectivo)}</span></div>
                            <div class="flex"><span>Transferencia:</span> <span>${fmt(closeResult.breakdown?.transferencia)}</span></div>
                            <div class="flex"><span>Tarjeta:</span> <span>${fmt(closeResult.breakdown?.tarjeta)}</span></div>
                            <hr />
                            <div class="flex bold"><span>Total Ventas:</span> <span>${fmt(closeResult.breakdown?.totalSales)}</span></div>
                            \${closeResult.notes ? \`<hr /><div>Obs: \${closeResult.notes}</div>\` : ''}
                            <script>
                              window.onload = function() {
                                window.print();
                                window.close();
                              }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    style={{
                      flex: 1, padding: "12px 16px", borderRadius: 8, border: `1px solid ${primary}`,
                      background: "transparent", color: primary, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "inline-flex",
                      alignItems: "center", justifyContent: "center", gap: 6
                    }}
                  >
                    <i className="ti ti-printer" style={{ fontSize: 16 }} /> Imprimir Resumen
                  </button>
                  <button
                    onClick={() => {
                      setCloseResult(null);
                      setShowCloseModal(false);
                      setClosingCashInput("");
                      setCloseNotes("");
                      if (pendingLogout) {
                        setPendingLogout(false);
                        logout();
                      }
                    }}
                    style={{
                      flex: 1, padding: "12px 16px", borderRadius: 8, border: "none",
                      background: primary, color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                    }}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => { setShowCloseModal(false); setPendingLogout(false); }} style={{ position: "absolute", top: 14, right: 14, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 999, width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <i className="ti ti-x" />
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #dc2626, #f97316)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="ti ti-lock" style={{ fontSize: 22, color: "#fff" }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0, fontFamily: "Syne, sans-serif" }}>Cerrar Caja</h2>
                    <p style={{ fontSize: 12, color: "var(--text2)", margin: 0 }}>Compara el efectivo real con el esperado</p>
                  </div>
                </div>

                {/* Resumen de sesión */}
                <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 16px", marginBottom: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--text2)", fontWeight: 600 }}>Apertura:</span>
                    <span style={{ color: "var(--text)", fontWeight: 700 }}>{fmt(activeSession?.openingCash || 0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--text2)", fontWeight: 600 }}>Movimientos:</span>
                    <span style={{ color: "var(--text)", fontWeight: 700 }}>{fmt(expectedCash - (Number(activeSession?.openingCash) || 0))}</span>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 15 }}>
                    <span style={{ color: "var(--text)", fontWeight: 700 }}>Efectivo esperado:</span>
                    <span style={{ color: primary, fontWeight: 800, fontSize: 18 }}>{fmt(expectedCash)}</span>
                  </div>
                </div>

                {/* Input conteo real */}
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)", marginBottom: 14 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>Efectivo real contado:</span>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="$ 0"
                    value={closingCashInput}
                    onChange={(e) => setClosingCashInput(e.target.value)}
                    min="0"
                    autoFocus
                    style={{ fontSize: 18, fontWeight: 700, padding: "12px 14px" }}
                  />
                </label>

                {/* Diferencia en tiempo real */}
                {closingDiff !== null && (
                  <div style={{
                    borderRadius: 8, padding: "10px 14px", marginBottom: 14,
                    background: closingDiff === 0 ? "#dcfce7" : closingDiff > 0 ? "#dbeafe" : "#fee2e2",
                    border: `1px solid ${closingDiff === 0 ? "#86efac" : closingDiff > 0 ? "#93c5fd" : "#fca5a5"}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "all 0.2s ease",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: closingDiff === 0 ? "#15803d" : closingDiff > 0 ? "#1d4ed8" : "#dc2626" }}>
                      {closingDiff === 0 ? "✓ Cuadre perfecto" : closingDiff > 0 ? "↑ Sobrante" : "↓ Faltante"}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: closingDiff === 0 ? "#15803d" : closingDiff > 0 ? "#1d4ed8" : "#dc2626" }}>
                      {closingDiff >= 0 ? "+" : ""}{fmt(closingDiff)}
                    </span>
                  </div>
                )}

                {/* Notas */}
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)", marginBottom: 18 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>Observaciones (opcional):</span>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Notas del cierre..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    style={{ resize: "vertical", fontFamily: "'DM Sans', sans-serif" }}
                  />
                </label>

                <button
                  disabled={submitting || closingCashInput === ""}
                  onClick={handleClose}
                  style={{
                    background: "linear-gradient(135deg, #dc2626, #f97316)", color: "#fff", border: "none",
                    borderRadius: 10, padding: "14px 20px", fontWeight: 700, fontSize: 14,
                    cursor: (submitting || closingCashInput === "") ? "not-allowed" : "pointer",
                    opacity: (submitting || closingCashInput === "") ? 0.7 : 1,
                    fontFamily: "'DM Sans', sans-serif", width: "100%", transition: "all 0.2s",
                  }}
                >
                  {submitting ? "Cerrando..." : "Cerrar Caja"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}