import { useEffect, useState, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/apiFetch";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META = {
  pendiente_uber: { label: "Uber Eats",  color: "#06b6d4" },
  pendiente:      { label: "Pendiente",  color: "#fbbf24" },
  en_cocina:      { label: "En Cocina",  color: "#f97316" },
  empacado:       { label: "Empacado",   color: "#10b981" },
  entregado:      { label: "Entregado",  color: "#6b7280" },
};

const getStatusColor = (status) => STATUS_META[status]?.color ?? "#6b7280";
const getStatusLabel = (status) => STATUS_META[status]?.label ?? status;

const formatCLP = (amount) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

// ── Componente principal ──────────────────────────────────────────────────────

export default function Pedidos() {
  const { primary, showToast } = useTheme();
  const { user } = useAuth();

  // ── Estado ────────────────────────────────────────────────────────────────
  const [uberOrders,    setUberOrders]    = useState([]);
  const [activeOrders,  setActiveOrders]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [updatingId,    setUpdatingId]    = useState(null);

  // Calendario (igual que Cocina)
  const [currentDate,   setCurrentDate]   = useState(new Date());
  const [selectedDate,  setSelectedDate]  = useState(new Date());

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

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
  }, [showToast]);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "empleado") {
      fetchOrders();
    }
    // Polling cada 30 s para reflejar cambios de cocina
    const interval = setInterval(fetchOrders, 30_000);
    return () => clearInterval(interval);
  }, [fetchOrders, user]);

  // ── Cambio de estado de un pedido ────────────────────────────────────────

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await apiFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body:   JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("No se pudo actualizar el estado");

      const update = (list) =>
        list.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));

      // Los entregados desaparecen del panel
      setUberOrders((prev)   => update(prev).filter((o) => o.status !== "entregado"));
      setActiveOrders((prev) => update(prev).filter((o) => o.status !== "entregado"));

      showToast(`Pedido marcado como ${getStatusLabel(newStatus)}`, "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Calendario (igual que Cocina) ────────────────────────────────────────

  const generateCalendar = () => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay     = new Date(year, month, 1);
    const daysInMonth  = new Date(year, month + 1, 0).getDate();
    const startingDay  = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const calendarDays = generateCalendar();
  const monthName = currentDate.toLocaleDateString("es-CL", {
    month: "long", year: "numeric",
  });

  // Pedidos del día seleccionado (de activeOrders, excluyendo pendiente_uber)
  const ordersForSelectedDate = activeOrders.filter((o) => {
    if (o.status === "pendiente_uber") return false;
    if (!o.deliveryDate) return false;
    return new Date(o.deliveryDate).toDateString() === selectedDate.toDateString();
  });

  // Pedidos de Uber del día seleccionado
  const uberForSelectedDate = uberOrders.filter((o) => {
    if (!o.deliveryDate && !o.orderDate) return false;
    const dateToUse = o.deliveryDate || o.orderDate;
    return new Date(dateToUse).toDateString() === selectedDate.toDateString();
  });

  // ── Tarjeta de pedido ─────────────────────────────────────────────────────

  const OrderCard = ({ order, showStatus = true }) => {
    const busy = updatingId === order.id;

    return (
      <div
        className="card"
        style={{
          padding:       12,
          marginBottom:  10,
          borderLeft:    `4px solid ${getStatusColor(order.status)}`,
          display:       "flex",
          flexDirection: "column",
          gap:           8,
          opacity:       busy ? 0.7 : 1,
          transition:    "opacity 0.2s",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
              #{order.id.substring(0, 8).toUpperCase()}
              {order.source === "uber_eats" && (
                <span style={{
                  marginLeft: 6, fontSize: 9, padding: "2px 5px",
                  borderRadius: 3, background: "#06b6d4", color: "#fff",
                  fontWeight: 800, letterSpacing: "0.5px",
                }}>
                  UBER
                </span>
              )}
            </div>
            {order.deliveryDate && (
              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>
                {formatTime(order.deliveryDate)}
              </div>
            )}
            <div style={{ fontSize: 12, fontWeight: 600, color: primary, marginTop: 4 }}>
              {formatCLP(order.totalAmount)}
            </div>
          </div>

          {showStatus && (
            <span style={{
              display: "inline-block", fontSize: 10, fontWeight: 700,
              padding: "3px 8px", borderRadius: 4,
              background: getStatusColor(order.status), color: "#fff",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {getStatusLabel(order.status)}
            </span>
          )}
        </div>

        {order.OrderItems?.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--text2)", maxHeight: 60, overflow: "auto" }}>
            {order.OrderItems.map((item) => (
              <div key={item.id} style={{ marginTop: 4 }}>
                • {item.productNameSnapshot} (×{item.quantity})
              </div>
            ))}
          </div>
        )}

        {order.notes && (
          <div style={{
            fontSize: 11, color: "#e11d48", fontStyle: "italic",
            paddingTop: 4, borderTop: "1px solid var(--border)",
          }}>
            📝 {order.notes}
          </div>
        )}

        {/* Acciones según estado */}
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {/* Uber pendiente → confirmar */}
          {order.status === "pendiente_uber" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleStatusChange(order.id, "pendiente")}
              style={{
                flex: 1, padding: "8px 10px", borderRadius: 6, border: "none",
                background: busy ? "#e5e7eb" : primary,
                color: busy ? "#9ca3af" : "#fff",
                fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              <i className="ti ti-circle-check" /> Confirmar pedido
            </button>
          )}

          {/* Empacado → marcar entregado */}
          {order.status === "empacado" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleStatusChange(order.id, "entregado")}
              style={{
                flex: 1, padding: "8px 10px", borderRadius: 6, border: "none",
                background: busy ? "#e5e7eb" : "#10b981",
                color: busy ? "#9ca3af" : "#fff",
                fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              <i className="ti ti-truck-delivery" /> Marcar entregado
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="page-container"
      style={{ maxWidth: 1200, margin: "0 auto", animation: "fadein 0.3s ease", padding: "0 16px", height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
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
        <div className="pedidos-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20, flex: 1, minHeight: 0 }}>

          {/* ── Sidebar: Calendario + Uber pendientes ── */}
          <aside className="card pedidos-sidebar" style={{ padding: 16, height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>

            {/* Navegación del mes */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 14 }}
              >
                <i className="ti ti-chevron-left" />
              </button>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, textTransform: "capitalize" }}>
                {monthName}
              </h3>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 14 }}
              >
                <i className="ti ti-chevron-right" />
              </button>
            </div>

            {/* Encabezados días */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
              {["D","L","M","M","J","V","S"].map((d, i) => (
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
                const dayOrders  = activeOrders.filter(
                  (o) => o.deliveryDate && new Date(o.deliveryDate).toDateString() === day.toDateString()
                );

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    style={{
                      padding: "8px 4px", borderRadius: 6,
                      border:     isSelected ? `2px solid ${primary}` : "1px solid var(--border)",
                      background: isSelected ? `${primary}20` : isToday ? "var(--bg2, #f5f5f5)" : "transparent",
                      color: "var(--text)", fontSize: 11, fontWeight: isToday ? 700 : 500,
                      cursor: "pointer", display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 2, minHeight: 40,
                    }}
                  >
                    <span>{day.getDate()}</span>
                    {dayOrders.length > 0 && (
                      <span style={{ fontSize: 8, color: primary, fontWeight: 700 }}>
                        •{dayOrders.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>



          </aside>

          {/* ── Contenido principal ── */}
          <div className="pedidos-main" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <div style={{ marginBottom: 8 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                {selectedDate.toLocaleDateString("es-CL", { weekday: "long", month: "long", day: "numeric" })}
              </h2>
            </div>

            {/* Grid de pedidos: activos del día (sin entregados) */}
            <div className="pedidos-orders" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20, flex: 1, minHeight: 0 }}>

              {/* Recuadro izquierdo: Uber Eats */}
              <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "#06b6d4" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Uber Eats Pendientes</h3>
                  <span style={{
                    marginLeft: "auto", display: "inline-flex", alignItems: "center",
                    justifyContent: "center", minWidth: 24, height: 24, borderRadius: 999,
                    background: "#06b6d4", color: "#fff", fontSize: 12, fontWeight: 700,
                  }}>
                    {uberForSelectedDate.length}
                  </span>
                </div>

                {uberForSelectedDate.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)" }}>
                    <i className="ti ti-mood-smile" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
                    <p>Sin pedidos de Uber para este día</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {uberForSelectedDate.map((order) => (
                      <OrderCard key={order.id} order={order} showStatus={false} />
                    ))}
                  </div>
                )}
              </section>

              {/* Recuadro derecho: Tabla de Pedidos del Día (Pendientes y En Proceso) */}
              <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", overflowX: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "var(--text2)" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Pedidos del Día</h3>
                  <span style={{
                    marginLeft: "auto", display: "inline-flex", alignItems: "center",
                    justifyContent: "center", minWidth: 24, height: 24, borderRadius: 999,
                    background: "var(--text2)", color: "#fff", fontSize: 12, fontWeight: 700,
                  }}>
                    {ordersForSelectedDate.length}
                  </span>
                </div>

                {ordersForSelectedDate.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)" }}>
                    <i className="ti ti-mood-smile" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
                    <p>Sin pedidos para este día</p>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 450 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left", color: "var(--text2)", fontSize: 12 }}>
                        <th style={{ padding: "10px 8px" }}>ID</th>
                        <th style={{ padding: "10px 8px" }}>Hora</th>
                        <th style={{ padding: "10px 8px" }}>Detalles</th>
                        <th style={{ padding: "10px 8px" }}>Total</th>
                        <th style={{ padding: "10px 8px" }}>Estado</th>
                        <th style={{ padding: "10px 8px", textAlign: "right" }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersForSelectedDate.map((order) => {
                        const busy = updatingId === order.id;
                        return (
                          <tr key={order.id} style={{ 
                            borderBottom: "1px solid var(--border)",
                            opacity: busy ? 0.6 : 1,
                            transition: "opacity 0.2s"
                          }}>
                            <td style={{ padding: "12px 8px", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                              #{order.id.substring(0, 8).toUpperCase()}
                            </td>
                            <td style={{ padding: "12px 8px", fontSize: 12, color: "var(--text)" }}>
                              {order.deliveryDate ? formatTime(order.deliveryDate) : "-"}
                            </td>
                            <td style={{ padding: "12px 8px", fontSize: 11, color: "var(--text2)", maxWidth: 200 }}>
                              <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {order.OrderItems?.map(item => `${item.quantity}x ${item.productNameSnapshot}`).join(", ")}
                              </div>
                              {order.notes && (
                                <div style={{ color: "#e11d48", fontStyle: "italic", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  📝 {order.notes}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "12px 8px", fontSize: 12, fontWeight: 600, color: primary }}>
                              {formatCLP(order.totalAmount)}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 4,
                                background: getStatusColor(order.status), color: "#fff", whiteSpace: "nowrap"
                              }}>
                                {getStatusLabel(order.status)}
                              </span>
                            </td>
                            <td style={{ padding: "12px 8px", textAlign: "right" }}>
                              {order.status === "empacado" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleStatusChange(order.id, "entregado")}
                                  style={{
                                    padding: "6px 12px", borderRadius: 4, border: "none",
                                    background: busy ? "#e5e7eb" : "#10b981", color: busy ? "#9ca3af" : "#fff",
                                    fontSize: 11, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer"
                                  }}
                                >
                                  Entregar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .pedidos-layout {
            grid-template-columns: 300px 1fr;
          }
          .pedidos-sidebar {
            position: static;
            height: 100%;
          }
          .pedidos-orders {
            grid-template-columns: 340px 1fr !important;
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
