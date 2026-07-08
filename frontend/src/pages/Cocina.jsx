import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/apiFetch";

const STATUS_META = {
  pendiente: { label: "Pendiente", color: "#f59e0b", bg: "#fef3c7" },
  en_cocina: { label: "En producción", color: "#f97316", bg: "#ffedd5" },
  empacado: { label: "Empacado", color: "#10b981", bg: "#dcfce7" },
  entregado: { label: "Entregado", color: "#6b7280", bg: "#f3f4f6" },
};

const getStatusColor = (status) => STATUS_META[status]?.color ?? "#6b7280";
const getStatusBg = (status) => STATUS_META[status]?.bg ?? "#f3f4f6";
const getStatusLabel = (status) => STATUS_META[status]?.label ?? status;

const formatCLP = (amount) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toUpperCase();

const formatDate = (date) =>
  new Date(date).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });

const DAY_HEADERS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function generateCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

export default function Cocina() {
  const { primary, showToast } = useTheme();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [detailOrder, setDetailOrder] = useState(null);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59, 999);

      const response = await apiFetch(
        `/api/orders/kitchen/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) throw new Error("No se pudieron obtener las órdenes");

      const data = await response.json();
      setOrders(data);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [currentDate, showToast]);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "cocinero") {
      fetchOrders();
    }

    const interval = setInterval(fetchOrders, 30_000);
    return () => clearInterval(interval);
  }, [fetchOrders, user]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await apiFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("No se pudo actualizar el estado");

      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)));
      showToast(`Orden marcada como ${getStatusLabel(newStatus)}`, "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("¿Seguro que deseas cancelar este pedido? Se marcará como 'Cancelado por producción'.")) return;

    try {
      const response = await apiFetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Cancelado por producción", isRefunded: false }),
      });

      if (!response.ok) throw new Error("No se pudo cancelar el pedido");

      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: "cancelado" } : order)));
      setDetailOrder(null);
      showToast("Pedido cancelado correctamente", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const pendingOrders = useMemo(() =>
    orders.filter((order) => {
      const orderDate = order.deliveryDate || order.orderDate;
      return order.status === "pendiente" && orderDate && new Date(orderDate).toDateString() === selectedDate.toDateString();
    }),
    [orders, selectedDate]
  );

  const kitchenOrders = useMemo(() =>
    orders.filter((order) => {
      const orderDate = order.deliveryDate || order.orderDate;
      return order.status === "en_cocina" && orderDate && new Date(orderDate).toDateString() === selectedDate.toDateString();
    }),
    [orders, selectedDate]
  );

  const calendarDays = useMemo(() => generateCalendar(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  const monthName = currentDate.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const OrderCard = ({ order }) => (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: primary }}>
            #{String(order.id).slice(0, 8).toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: "var(--text)", marginTop: 2 }}>
            {formatTime(order.deliveryDate)}
          </div>
        </div>
        <span
          style={{
            display: "inline-block",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 999,
            background: getStatusBg(order.status),
            color: getStatusColor(order.status),
            border: `1px solid ${getStatusColor(order.status)}30`,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
        {formatCLP(order.totalAmount)}
      </div>

      {order.OrderItems?.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--text2)", maxHeight: 64, overflow: "auto" }}>
          {order.OrderItems.map((item) => (
            <div key={item.id} style={{ marginTop: 4 }}>
              • {item.productNameSnapshot} (x{item.quantity})
              {item.components && item.components.length > 0 && (
                <div style={{ paddingLeft: 12, fontSize: 10, color: "var(--text2)", fontStyle: "italic" }}>
                  {item.components.map((c, i) => (
                    <div key={i}>- {c.category}: {c.productName} ({c.variantName})</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {order.notes && (
        <div style={{ fontSize: 11, color: "#e11d48", fontStyle: "italic", paddingTop: 4, borderTop: "1px solid var(--border)" }}>
          Obs: {order.notes}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        <button
          type="button"
          onClick={() => setDetailOrder(order)}
          style={{
            flex: 1,
            padding: "7px 12px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--surface2)",
            color: "var(--text)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Detalle
        </button>

        {order.status === "pendiente" && (
          <button
            type="button"
            onClick={() => handleStatusChange(order.id, "en_cocina")}
            style={{
              flex: 1,
              padding: "7px 12px",
              borderRadius: 6,
              border: "none",
              background: primary,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <i className="ti ti-chef-hat" /> Comenzar
          </button>
        )}

        {order.status === "en_cocina" && (
          <button
            type="button"
            onClick={() => handleStatusChange(order.id, "empacado")}
            style={{
              flex: 1,
              padding: "7px 12px",
              borderRadius: 6,
              border: "none",
              background: "#10b981",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <i className="ti ti-package" /> Empacado
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: "0 auto", animation: "fadein 0.3s ease", height: "calc(100dvh - 64px)", display: "flex", flexDirection: "column" }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
            Producción
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
            Gestión de órdenes en producción
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)" }}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, animation: "spin 2s linear infinite", display: "inline-block" }} />
          <p style={{ marginTop: 12 }}>Cargando órdenes...</p>
        </div>
      ) : (
        <div className="kitchen-layout">
          <aside className="kitchen-sidebar">
            {/* Botón para alternar calendario en móvil */}
            <button
              className="mobile-calendar-toggle"
              onClick={() => setShowMobileCalendar(!showMobileCalendar)}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 12,
                color: "var(--text)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <i className={`ti ${showMobileCalendar ? "ti-calendar-minus" : "ti-calendar-plus"}`} style={{ fontSize: 16, color: primary }} />
              {showMobileCalendar ? "Ocultar Calendario" : "Mostrar Calendario"}
            </button>

            <div className={`card calendar-card ${showMobileCalendar ? "show" : ""}`} style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 16, padding: 6 }}
                >
                  <i className="ti ti-chevron-left" />
                </button>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {monthName}
                </h3>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 16, padding: 6 }}
                >
                  <i className="ti ti-chevron-right" />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
                {DAY_HEADERS.map((day, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text2)", padding: "4px 0" }}>
                    {day}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;

                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayOrders = orders.filter((order) => {
                    const orderDate = order.deliveryDate || order.orderDate;
                    return orderDate && new Date(orderDate).toDateString() === day.toDateString();
                  });

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      style={{
                        padding: "6px 2px",
                        borderRadius: 8,
                        border: isSelected ? `2px solid ${primary}` : "1px solid transparent",
                        background: isSelected ? `${primary}15` : "transparent",
                        color: isToday ? "#fff" : "var(--text)",
                        fontSize: 12,
                        fontWeight: isToday ? 700 : 500,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 3,
                        minHeight: 38,
                        position: "relative",
                      }}
                    >
                      {isToday ? (
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          {day.getDate()}
                        </span>
                      ) : (
                        <span>{day.getDate()}</span>
                      )}

                      {dayOrders.length > 0 && (
                        <div style={{ display: "flex", gap: 2 }}>
                          {[...new Set(dayOrders.map((o) => o.status))].slice(0, 3).map((status, index) => (
                            <span
                              key={`${status}-${index}`}
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: getStatusColor(status),
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={goToToday}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "6px 0",
                  background: "transparent",
                  border: `1px solid ${primary}`,
                  borderRadius: 6,
                  color: primary,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <i className="ti ti-calendar-event" style={{ marginRight: 4 }} />
                Hoy
              </button>
            </div>

            <div className="card pending-card" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                  Pendientes
                </h3>
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 22, borderRadius: 999, background: getStatusColor("pendiente"), color: "#fff", fontSize: 11, fontWeight: 700 }}>
                  {pendingOrders.length}
                </span>
              </div>

              {pendingOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 12px", color: "var(--text2)" }}>
                  <i className="ti ti-mood-smile" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ fontSize: 12, margin: 0 }}>Sin órdenes pendientes</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {pendingOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </div>
          </aside>

          <div className="kitchen-main card">
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0, fontFamily: "Syne, sans-serif" }}>
                En producción
              </h2>
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                {selectedDate.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {kitchenOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text2)" }}>
                  <i className="ti ti-calendar-off" style={{ fontSize: 36, display: "block", marginBottom: 10, opacity: 0.4 }} />
                  <p style={{ fontSize: 13 }}>Sin órdenes en producción</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {kitchenOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detailOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.54)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
            animation: "fadein 0.2s ease",
          }}
          onClick={() => setDetailOrder(null)}
        >
          <div
            className="modal-content"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              width: "min(460px, 100%)",
              boxShadow: "0 28px 80px rgba(15, 23, 42, 0.32)",
              position: "relative",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailOrder(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                borderRadius: 999,
                width: 30,
                height: 30,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <i className="ti ti-x" />
            </button>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: "0 0 20px", fontFamily: "Syne, sans-serif" }}>
              Boleta
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, fontSize: 13 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--text2)", fontWeight: 700, minWidth: 120 }}>Fecha entrega:</span>
                <span style={{ color: "var(--text)" }}>{detailOrder.deliveryDate ? formatDate(detailOrder.deliveryDate) : "Sin fecha"}</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--text2)", fontWeight: 700, minWidth: 120 }}>Horario retiro:</span>
                <span style={{ color: "var(--text)" }}>{detailOrder.deliveryDate ? formatTime(detailOrder.deliveryDate) : "—"}</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--text2)", fontWeight: 700, minWidth: 120 }}>Cliente:</span>
                <span style={{ color: "var(--text)" }}>{detailOrder.Customer?.fullName || "—"}</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--text2)", fontWeight: 700, minWidth: 120 }}>Teléfono:</span>
                <span style={{ color: "var(--text)" }}>{detailOrder.Customer?.phone || "—"}</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 16px" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              {(detailOrder.OrderItems || []).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{item.productNameSnapshot} {item.quantity > 1 ? `× ${item.quantity}` : ""}</div>
                    {item.components && Array.isArray(item.components) && (
                      <div style={{ marginLeft: 8, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                        {item.components.map((c, idx) => (
                          <div key={idx} style={{ fontSize: 11, color: "var(--text2)" }}>
                            - {c.category}: {c.productName} ({c.variantName})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>
                    {formatCLP(item.unitPrice * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {detailOrder.notes && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Nota:</div>
                <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text2)", fontStyle: "italic", minHeight: 40 }}>
                  {detailOrder.notes}
                </div>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 14px" }} />

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

            <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => handleCancelOrder(detailOrder.id)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid #ef4444",
                  background: "#fee2e2",
                  color: "#ef4444",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .kitchen-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 0;
          width: 100%;
          flex: 1;
          padding-bottom: 20px;
          overflow: hidden;
        }

        .kitchen-sidebar {
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 0;
          flex: 1 1 50%;
          min-width: 0;
          position: relative;
        }

        .kitchen-main {
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 16px;
          flex: 1 1 50%;
          min-width: 0;
        }
        
        .mobile-calendar-toggle {
          display: flex !important;
        }
        .calendar-card {
          display: none;
        }
        .calendar-card.show {
          display: block;
          position: absolute;
          top: 52px;
          left: 0;
          right: 0;
          z-index: 100;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .page-container {
          padding: 0 16px;
        }

        .kitchen-main.card,
        .pending-card {
          padding: 16px;
        }

        .modal-content {
          padding: 20px 16px;
        }

        @media (min-width: 768px) {
          .kitchen-layout {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
            gap: 20px;
            margin-bottom: 0;
            overflow: hidden;
          }

          .kitchen-sidebar,
          .kitchen-main {
            flex: unset !important;
            height: 100%;
            margin-bottom: 0;
          }
          
          .mobile-calendar-toggle {
            display: none !important;
          }
          .calendar-card {
            display: block !important;
          }

          .page-container {
            padding: 0 32px;
          }

          .kitchen-main.card,
          .pending-card {
            padding: 24px;
          }

          .modal-content {
            padding: 28px 32px;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
