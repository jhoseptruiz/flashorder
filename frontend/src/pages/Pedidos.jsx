import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useCashRegister } from "../context/CashRegisterContext";
import { apiFetch } from "../utils/apiFetch";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META = {
  pendiente_uber: { label: "Uber Eats",  color: "#06b6d4", bg: "#ecfeff" },
  pendiente:      { label: "Pendiente",  color: "#6b7280", bg: "#f3f4f6" },
  en_cocina:      { label: "Preparando", color: "#f59e0b", bg: "#fef9c3" },
  empacado:       { label: "Empacado",   color: "#10b981", bg: "#dcfce7" },
  entregado:      { label: "Entregado",  color: "#6b7280", bg: "#f3f4f6" },
};

const getStatusColor = (status) => STATUS_META[status]?.color ?? "#6b7280";
const getStatusLabel = (status) => STATUS_META[status]?.label ?? status;
const getStatusBg    = (status) => STATUS_META[status]?.bg ?? "#f3f4f6";

const formatCLP = (amount) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();

const formatDate = (date) =>
  new Date(date).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });

const DAY_HEADERS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

// ── Calendario con semana empezando en Lunes ─────────────────────────────────

function generateCalendar(year, month) {
  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay() → 0=Dom, 1=Lun ... 6=Sáb
  // Para empezar en Lunes: Lun=0, Mar=1 ... Dom=6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6; // Domingo → offset 6

  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Pedidos() {
  const { primary, showToast } = useTheme();
  const { user } = useAuth();
  const { refreshSession } = useCashRegister();

  // ── Estado ────────────────────────────────────────────────────────────────
  const [uberOrders,    setUberOrders]    = useState([]);
  const [activeOrders,  setActiveOrders]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [updatingId,    setUpdatingId]    = useState(null);

  // Calendario
  const [currentDate,   setCurrentDate]   = useState(new Date());
  const [selectedDate,  setSelectedDate]  = useState(new Date());

  // Modal detalle
  const [detailOrder,   setDetailOrder]   = useState(null);

  // Modal confirmación de entrega (con saldo pendiente)
  const [deliveryConfirm, setDeliveryConfirm] = useState(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 2,
        0, 23, 59, 59, 999
      );

      const [uberRes, activeRes] = await Promise.all([
        apiFetch(`/api/orders/employee/uber-pending`),
        apiFetch(
          `/api/orders/employee/active?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        ),
      ]);

      if (!uberRes.ok || !activeRes.ok) throw new Error("Error al obtener pedidos");

      const [uberData, activeData] = await Promise.all([
        uberRes.json(),
        activeRes.json(),
      ]);

      setUberOrders(uberData);
      setActiveOrders(activeData);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, currentDate]);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "empleado") {
      fetchOrders();
    }
    const interval = setInterval(fetchOrders, 30_000);
    return () => clearInterval(interval);
  }, [fetchOrders, user]);

  // ── Cambio de estado de un pedido ────────────────────────────────────────

  const handleStatusChange = async (orderId, newStatus, skipConfirm = false) => {
    // Intercepción: si se marca como entregado y tiene saldo en efectivo, confirmar
    if (newStatus === "entregado" && !skipConfirm) {
      const order = [...activeOrders, ...uberOrders].find(o => o.id === orderId);
      if (order && order.paymentMethod === "efectivo") {
        const pending = Number(order.totalAmount || 0) - Number(order.depositAmount || 0);
        if (pending > 0) {
          setDeliveryConfirm({ order, pendingAmount: pending });
          return;
        }
      }
    }
    setUpdatingId(orderId);
    try {
      const res = await apiFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body:   JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("No se pudo actualizar el estado");

      showToast(`Pedido marcado como ${getStatusLabel(newStatus)}`, "success");
      refreshSession();
      fetchOrders();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Calendario ────────────────────────────────────────────────────────────

  const calendarDays = generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleDateString("es-CL", {
    month: "long", year: "numeric",
  });

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Pedidos del día seleccionado (excluyendo pendiente_uber)
  const ordersForSelectedDate = activeOrders.filter((o) => {
    if (o.status === "pendiente_uber") return false;
    const dateField = o.deliveryDate || o.orderDate;
    if (!dateField) return false;
    return new Date(dateField).toDateString() === selectedDate.toDateString();
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="page-container"
      style={{ maxWidth: 1200, margin: "0 auto", animation: "fadein 0.3s ease", padding: "0 16px", height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{
            fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700,
            color: "var(--text)", letterSpacing: "-0.3px",
          }}>
            📋 Pedidos y Calendario
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
            Gestión de pedidos del empleado
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)" }}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, animation: "spin 2s linear infinite", display: "inline-block" }} />
          <p style={{ marginTop: 12 }}>Cargando pedidos...</p>
        </div>
      ) : (
        <div className="pedidos-layout" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, flex: 1, minHeight: 0 }}>

          {/* ═══ COLUMNA IZQUIERDA ═══ */}
          <aside className="pedidos-sidebar" style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>

            {/* ── Calendario ── */}
            <div className="card" style={{ padding: 16 }}>
              {/* Navegación del mes */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 16, padding: 6 }}
                >
                  <i className="ti ti-chevron-left" />
                </button>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {monthName}
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 16, padding: 6 }}
                >
                  <i className="ti ti-chevron-right" />
                </button>
              </div>

              {/* Encabezados LUN → DOM */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
                {DAY_HEADERS.map((d, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text2)", padding: "4px 0" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Días */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;

                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isToday    = day.toDateString() === new Date().toDateString();

                  // Contar pedidos del día por estado para indicadores
                  const dayOrders = activeOrders.filter(
                    (o) => {
                      const d = o.deliveryDate || o.orderDate;
                      return d && new Date(d).toDateString() === day.toDateString() && o.status !== "pendiente_uber";
                    }
                  );

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      style={{
                        padding: "6px 2px", borderRadius: 8,
                        border: isSelected ? `2px solid ${primary}` : "1px solid transparent",
                        background: isSelected ? `${primary}15` : "transparent",
                        color: isToday ? "#fff" : "var(--text)",
                        fontSize: 12, fontWeight: isToday ? 700 : 500,
                        cursor: "pointer", display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 3, minHeight: 38,
                        position: "relative",
                      }}
                    >
                      {/* Círculo para el día actual */}
                      {isToday ? (
                        <span style={{
                          width: 26, height: 26, borderRadius: "50%", background: primary,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "#fff",
                        }}>
                          {day.getDate()}
                        </span>
                      ) : (
                        <span>{day.getDate()}</span>
                      )}
                      {/* Indicadores de estado */}
                      {dayOrders.length > 0 && (
                        <div style={{ display: "flex", gap: 2 }}>
                          {[...new Set(dayOrders.map(o => o.status))].slice(0, 3).map((st, j) => (
                            <span key={j} style={{
                              width: 5, height: 5, borderRadius: "50%",
                              background: getStatusColor(st),
                            }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Botón Hoy */}
              <button
                type="button"
                onClick={goToToday}
                style={{
                  marginTop: 10, width: "100%", padding: "6px 0",
                  background: "transparent", border: `1px solid ${primary}`,
                  borderRadius: 6, color: primary, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <i className="ti ti-calendar-event" style={{ marginRight: 4 }} />
                Hoy
              </button>
            </div>

            {/* ── Pedidos Entrantes (solo Uber) ── */}
            <div className="card" style={{ padding: 16, flex: 1, overflowY: "auto", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>Pedidos Entrantes</h3>
                {uberOrders.length > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    minWidth: 22, height: 22, borderRadius: 999,
                    background: "#06b6d4", color: "#fff", fontSize: 11, fontWeight: 700,
                  }}>
                    {uberOrders.length}
                  </span>
                )}
              </div>

              {uberOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 12px", color: "var(--text2)" }}>
                  <i className="ti ti-inbox-off" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ fontSize: 12, margin: 0 }}>Sin pedidos de Uber Eats</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {uberOrders.map((order) => {
                    const busy = updatingId === order.id;
                    const items = order.OrderItems || [];
                    const maxShow = 2;
                    const remaining = items.length - maxShow;

                    return (
                      <div
                        key={order.id}
                        style={{
                          border: "1px solid var(--border)", borderRadius: 10,
                          padding: 14, opacity: busy ? 0.6 : 1, transition: "opacity 0.2s",
                        }}
                      >
                        {/* Header: ID + nombre + total */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: primary }}>
                              #{order.id.substring(0, 4).toUpperCase()}
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                              {order.Customer?.fullName || "Cliente Uber"}
                            </div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                            {formatCLP(order.totalAmount)}
                          </div>
                        </div>

                        {/* Items */}
                        <div style={{
                          background: "var(--surface2)", borderRadius: 8, padding: "8px 12px",
                          marginBottom: 10, fontSize: 12, color: "var(--text)",
                        }}>
                          {items.slice(0, maxShow).map((item) => (
                            <div key={item.id} style={{ marginBottom: 2 }}>
                              X{item.quantity} {item.productNameSnapshot}
                            </div>
                          ))}
                          {remaining > 0 && (
                            <div style={{ color: "var(--text2)", fontStyle: "italic", fontSize: 11, marginTop: 2 }}>
                              +{remaining} más...
                            </div>
                          )}
                        </div>

                        {/* Botones: Aceptar, Rechazar, Ver detalle */}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleStatusChange(order.id, "pendiente")}
                            style={{
                              flex: 0, padding: "7px 14px", borderRadius: 6, border: "none",
                              background: busy ? "#e5e7eb" : "#10b981",
                              color: "#fff", fontSize: 11, fontWeight: 700,
                              cursor: busy ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                          >
                            <i className="ti ti-check" /> Aceptar
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleStatusChange(order.id, "rechazado")}
                            style={{
                              flex: 0, padding: "7px 14px", borderRadius: 6, border: "none",
                              background: busy ? "#e5e7eb" : "#ef4444",
                              color: "#fff", fontSize: 11, fontWeight: 700,
                              cursor: busy ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                          >
                            <i className="ti ti-x" /> Rechazar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailOrder(order)}
                            style={{
                              flex: 1, padding: "7px 14px", borderRadius: 6, border: "none",
                              background: "var(--text)",
                              color: "var(--bg)", fontSize: 11, fontWeight: 700,
                              cursor: "pointer", textAlign: "center",
                            }}
                          >
                            Ver detalle
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* ═══ COLUMNA DERECHA — TABLA DE PEDIDOS DEL DÍA ═══ */}
          <div className="pedidos-main card" style={{ padding: 20, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{
                fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0,
                fontFamily: "Syne, sans-serif",
              }}>
                Pedidos
              </h2>
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                {selectedDate.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
              {ordersForSelectedDate.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text2)" }}>
                  <i className="ti ti-calendar-off" style={{ fontSize: 36, display: "block", marginBottom: 10, opacity: 0.4 }} />
                  <p style={{ fontSize: 13 }}>Sin pedidos para este día</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", color: "var(--text)", fontSize: 13, fontWeight: 700 }}>
                      <th style={{ padding: "12px 10px" }}>ID</th>
                      <th style={{ padding: "12px 10px" }}>Cliente</th>
                      <th style={{ padding: "12px 10px" }}>Hora</th>
                      <th style={{ padding: "12px 10px" }}>Estado</th>
                      <th style={{ padding: "12px 10px", textAlign: "right" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersForSelectedDate.map((order) => {
                      const busy = updatingId === order.id;
                      const dateField = order.deliveryDate || order.orderDate;

                      return (
                        <tr
                          key={order.id}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            opacity: busy ? 0.6 : 1,
                            transition: "opacity 0.2s",
                          }}
                        >
                          <td style={{ padding: "14px 10px", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                            #{order.id.substring(0, 4).toUpperCase()}
                          </td>
                          <td style={{ padding: "14px 10px", fontSize: 13, color: "var(--text)" }}>
                            {order.Customer?.fullName || "—"}
                          </td>
                          <td style={{ padding: "14px 10px", fontSize: 13, color: "var(--text)" }}>
                            {dateField ? formatTime(dateField) : "—"}
                          </td>
                          <td style={{ padding: "14px 10px" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6,
                              background: getStatusBg(order.status),
                              color: getStatusColor(order.status),
                              border: `1px solid ${getStatusColor(order.status)}30`,
                              whiteSpace: "nowrap",
                            }}>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => setDetailOrder(order)}
                                style={{
                                  padding: "6px 14px", borderRadius: 6,
                                  border: "1px solid var(--border)",
                                  background: "var(--surface)", color: "var(--text)",
                                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                                }}
                              >
                                Detalle
                              </button>
                              {order.status === "empacado" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleStatusChange(order.id, "entregado")}
                                  style={{
                                    padding: "6px 14px", borderRadius: 6, border: "none",
                                    background: busy ? "#e5e7eb" : "#10b981",
                                    color: "#fff", fontSize: 11, fontWeight: 700,
                                    cursor: busy ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", gap: 4,
                                  }}
                                >
                                  <i className="ti ti-check" /> Entregar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL DETALLE — BOLETA ═══ */}
      {detailOrder && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.54)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 100, padding: 20,
            animation: "fadein 0.2s ease",
          }}
          onClick={() => setDetailOrder(null)}
        >
          <div
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "28px 32px", width: "min(460px, 100%)",
              boxShadow: "0 28px 80px rgba(15, 23, 42, 0.32)", position: "relative",
              maxHeight: "85vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button
              onClick={() => setDetailOrder(null)}
              style={{
                position: "absolute", top: 14, right: 14,
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text)", borderRadius: 999, width: 30, height: 30,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <i className="ti ti-x" />
            </button>

            {/* Título */}
            <h2 style={{
              fontSize: 22, fontWeight: 700, color: "var(--text)", margin: "0 0 20px",
              fontFamily: "Syne, sans-serif",
            }}>
              Boleta
            </h2>

            {/* Info del pedido */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, fontSize: 13 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--text2)", fontWeight: 700, minWidth: 120 }}>Fecha entrega:</span>
                <span style={{ color: "var(--text)" }}>
                  {detailOrder.deliveryDate ? formatDate(detailOrder.deliveryDate) : "Sin fecha"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--text2)", fontWeight: 700, minWidth: 120 }}>Horario retiro:</span>
                <span style={{ color: "var(--text)" }}>
                  {detailOrder.deliveryDate ? formatTime(detailOrder.deliveryDate) : "—"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--text2)", fontWeight: 700, minWidth: 120 }}>Cliente:</span>
                <span style={{ color: "var(--text)" }}>
                  {detailOrder.Customer?.fullName || "—"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--text2)", fontWeight: 700, minWidth: 120 }}>Teléfono:</span>
                <span style={{ color: "var(--text)" }}>
                  {detailOrder.Customer?.phone || "—"}
                </span>
              </div>
            </div>

            {/* Separador */}
            <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 16px" }} />

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              {(detailOrder.OrderItems || []).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      {item.productNameSnapshot}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>
                      {item.ProductVariant?.variantName || ""} {item.quantity > 1 ? `× ${item.quantity}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>
                    {formatCLP(item.unitPrice * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Nota */}
            {detailOrder.notes && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Nota:</div>
                <div style={{
                  background: "var(--surface2)", borderRadius: 8, padding: "10px 14px",
                  fontSize: 12, color: "var(--text2)", fontStyle: "italic",
                  minHeight: 40,
                }}>
                  {detailOrder.notes}
                </div>
              </div>
            )}

            {/* Separador */}
            <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 14px" }} />

            {/* Abono y Total */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              {Number(detailOrder.depositAmount || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>Abono:</span>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>{formatCLP(detailOrder.depositAmount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }}>
                <span style={{ fontWeight: 800, color: "var(--text)" }}>Total:</span>
                <span style={{ fontWeight: 800, color: primary }}>{formatCLP(detailOrder.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIRMACIÓN DE ENTREGA ═══ */}
      {deliveryConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.54)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 100, padding: 20,
            animation: "fadein 0.2s ease",
          }}
          onClick={() => setDeliveryConfirm(null)}
        >
          <div
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: 28, width: "min(420px, 100%)",
              boxShadow: "0 28px 80px rgba(15, 23, 42, 0.32)", position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setDeliveryConfirm(null)} style={{ position: "absolute", top: 14, right: 14, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 999, width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <i className="ti ti-x" />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #f59e0b, #f97316)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0, fontFamily: "Syne, sans-serif" }}>Confirmar Entrega</h2>
                <p style={{ fontSize: 12, color: "var(--text2)", margin: 0 }}>Pedido #{deliveryConfirm.order.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div style={{
              background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10,
              padding: "14px 16px", marginBottom: 18,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 6 }}>
                <i className="ti ti-cash" style={{ marginRight: 6 }} />
                Este pedido tiene un saldo pendiente en efectivo:
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "#92400e" }}>Total del pedido:</span>
                <span style={{ fontWeight: 700, color: "#78350f" }}>{formatCLP(deliveryConfirm.order.totalAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "#92400e" }}>Abono recibido:</span>
                <span style={{ fontWeight: 700, color: "#78350f" }}>{formatCLP(deliveryConfirm.order.depositAmount)}</span>
              </div>
              <div style={{ borderTop: "1px solid #fcd34d", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 16 }}>
                <span style={{ fontWeight: 700, color: "#78350f" }}>Cobrar al entregar:</span>
                <span style={{ fontWeight: 800, color: "#dc2626", fontSize: 18 }}>{formatCLP(deliveryConfirm.pendingAmount)}</span>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 18 }}>
              Asegúrate de cobrar el saldo pendiente antes de marcar como entregado. El monto se registrará automáticamente en la caja.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeliveryConfirm(null)}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text)", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const orderId = deliveryConfirm.order.id;
                  setDeliveryConfirm(null);
                  handleStatusChange(orderId, "entregado", true);
                }}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 8, border: "none",
                  background: "#10b981", color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <i className="ti ti-check" style={{ marginRight: 4 }} /> Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .pedidos-layout {
            grid-template-columns: 320px 1fr !important;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
