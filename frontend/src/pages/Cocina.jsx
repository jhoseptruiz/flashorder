import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/apiFetch";

const getStatusColor = (status) => {
  const colors = {
    pendiente: "#fbbf24",      // Amarillo
    en_cocina: "#f97316",       // Naranja
    empacado: "#10b981",        // Verde
    entregado: "#0ea5e9",       // Azul
  };
  return colors[status] || "#6b7280";
};

const formatCLP = (amount) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(amount);
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Cocina() {
  const { primary, showToast } = useTheme();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Obtener órdenes del mes actual y el siguiente
 const fetchOrders = async () => {
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
        0,
        23,
        59,
        59,
        999
      );

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
  };

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "cocinero") {
      fetchOrders();
    }
  }, [user, currentDate]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await apiFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("No se pudo actualizar el estado");

      const updatedOrder = await response.json();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        )
      );

      showToast(
        `Orden actualizada a ${newStatus}`,
        "success"
      );
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  // Filtrar órdenes por estado y fecha
  const ordersForDate = (date, status) => {
    return orders.filter((order) => {
      const orderDate = new Date(order.deliveryDate).toDateString();
      const selectedDateStr = new Date(date).toDateString();
      return (
        order.status === status &&
        orderDate === selectedDateStr
      );
    });
  };

  const pendingOrders = ordersForDate(selectedDate, "pendiente");
  const kitchenOrders = ordersForDate(selectedDate, "en_cocina");

  // Generar días del calendario
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const calendarDays = generateCalendar();
  const monthName = currentDate.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const OrderCard = ({ order, showStatus = true }) => (
    <div
      className="card"
      style={{
        padding: 12,
        marginBottom: 10,
        borderLeft: `4px solid ${getStatusColor(order.status)}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
            #{order.id.substring(0, 8).toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>
            {formatTime(order.deliveryDate)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: primary, marginTop: 4 }}>
            {formatCLP(order.totalAmount)}
          </div>
        </div>
        {showStatus && (
          <span
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 4,
              background: getStatusColor(order.status),
              color: "#fff",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {order.status}
          </span>
        )}
      </div>

      {order.OrderItems && order.OrderItems.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--text2)", maxHeight: 60, overflow: "auto" }}>
          {order.OrderItems.map((item) => (
            <div key={item.id} style={{ marginTop: 4 }}>
              • {item.productNameSnapshot} (x{item.quantity})
            </div>
          ))}
        </div>
      )}

      {order.notes && (
        <div style={{ fontSize: 11, color: "#e11d48", fontStyle: "italic", paddingTop: 4, borderTop: "1px solid var(--border)" }}>
          📝 {order.notes}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        {order.status === "pendiente" && (
          <button
            type="button"
            onClick={() => handleStatusChange(order.id, "en_cocina")}
            style={{
              flex: 1,
              padding: "8px 10px",
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
              padding: "8px 10px",
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
    <div className="page-container" style={{ maxWidth: 1200, margin: "0 auto", animation: "fadein 0.3s ease", padding: "0 16px", height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
             Cocina
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>Gestión de órdenes en cocina</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)" }}>
          <i className="ti ti-loader-2" style={{ fontSize: 32, animation: "spin 2s linear infinite", display: "inline-block" }} />
          <p style={{ marginTop: 12 }}>Cargando órdenes...</p>
        </div>
      ) : (
        <div className="kitchen-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20, flex: 1, minHeight: 0 }}>
          {/* Calendario Sidebar */}
          <aside className="card kitchen-calendar" style={{ padding: 16, height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button
                type="button"
                onClick={goToPreviousMonth}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 14 }}
              >
                <i className="ti ti-chevron-left" />
              </button>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, textTransform: "capitalize" }}>
                {monthName}
              </h3>
              <button
                type="button"
                onClick={goToNextMonth}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text2)", fontSize: 14 }}
              >
                <i className="ti ti-chevron-right" />
              </button>
            </div>

            {/* Encabezados de días */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
              {["D", "L", "M", "M", "J", "V", "S"].map((day, i) => (
                <div
                  key={i}
                  style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text2)", padding: "4px 0" }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Días del calendario */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {calendarDays.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} />;
                }

                const isSelected = day.toDateString() === selectedDate.toDateString();
                const isToday = day.toDateString() === new Date().toDateString();
                const dayOrders = orders.filter(
                  (o) => new Date(o.deliveryDate).toDateString() === day.toDateString()
                );

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    style={{
                      padding: "8px 4px",
                      borderRadius: 6,
                      border: isSelected ? `2px solid ${primary}` : "1px solid var(--border)",
                      background: isSelected ? `${primary}20` : isToday ? `${primary}10` : "transparent",
                      color: "var(--text)",
                      fontSize: 11,
                      fontWeight: isToday ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      minHeight: 40,
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

          {/* Contenedor principal */}
          <div className="kitchen-main" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <div style={{ marginBottom: 8 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                {selectedDate.toLocaleDateString("es-CL", { weekday: "long", month: "long", day: "numeric" })}
              </h2>
            </div>

            {/* Grid de Pendientes y En Cocina */}
            <div className="kitchen-orders" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 20, flex: 1, minHeight: 0 }}>
              {/* Sección Pendientes */}
              <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: getStatusColor("pendiente"),
                    }}
                  />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                    Pendientes
                  </h3>
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 24,
                      height: 24,
                      borderRadius: 999,
                      background: getStatusColor("pendiente"),
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {pendingOrders.length}
                  </span>
                </div>

                {pendingOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)" }}>
                    <i className="ti ti-mood-smile" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
                    <p>Sin órdenes pendientes</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {pendingOrders.map((order) => (
                      <OrderCard key={order.id} order={order} showStatus={false} />
                    ))}
                  </div>
                )}
              </section>

              {/* Sección En Cocina */}
              <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: getStatusColor("en_cocina"),
                    }}
                  />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                    En Cocina
                  </h3>
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 24,
                      height: 24,
                      borderRadius: 999,
                      background: getStatusColor("en_cocina"),
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {kitchenOrders.length}
                  </span>
                </div>

                {kitchenOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)" }}>
                    <i className="ti ti-mood-smile" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
                    <p>Sin órdenes en cocina</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {kitchenOrders.map((order) => (
                      <OrderCard key={order.id} order={order} showStatus={false} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .kitchen-layout {
            grid-template-columns: 300px 1fr;
          }

          .kitchen-calendar {
            position: static;
            height: 100%;
          }

          .kitchen-orders {
            grid-template-columns: 1fr 1fr !important;
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
