import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/apiFetch";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from "recharts";

// ── Constantes de color para métodos de pago ──────────────────────────────────
const COLORS = {
  efectivo: "#10b981",       // Verde esmeralda
  tarjeta: "#3b82f6",        // Azul
  transferencia: "#8b5cf6",  // Púrpura
};

const PERIOD_LABELS = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CL")}`;

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ── Custom tooltip para el gráfico ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "12px 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      fontSize: 13, minWidth: 180,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--text)", fontFamily: "Syne, sans-serif" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text2)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: "inline-block" }} />
            {p.dataKey.charAt(0).toUpperCase() + p.dataKey.slice(1)}
          </span>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>{fmt(p.value)}</span>
        </div>
      ))}
      <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--text)" }}>
        <span>Total</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
}

// ── Mini Calendario ───────────────────────────────────────────────────────────
function MiniCalendar({ pendingByDay, year, month, onNavigate }) {
  const firstDay = new Date(year, month - 1, 1);
  let startDow = firstDay.getDay(); // 0=Dom
  startDow = startDow === 0 ? 6 : startDow - 1; // Convertir a 0=Lun
  const daysInMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const cells = [];
  // Celdas vacías antes del primer día
  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={`e-${i}`} />);
  }
  // Días del mes
  for (let d = 1; d <= daysInMonth; d++) {
    const count = pendingByDay[d] || 0;
    const isToday = isCurrentMonth && today.getDate() === d;
    cells.push(
      <div
        key={d}
        style={{
          position: "relative",
          aspectRatio: "1",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: isToday ? "var(--primary)" : count > 0 ? "var(--surface2)" : "transparent",
          color: isToday ? "#fff" : "var(--text)",
          fontWeight: isToday ? 700 : 500,
          fontSize: 13,
          transition: "all 0.15s ease",
          cursor: count > 0 ? "default" : "default",
        }}
      >
        {d}
        {count > 0 && (
          <span style={{
            position: "absolute",
            top: 2,
            right: 2,
            background: "#ef4444",
            color: "#fff",
            borderRadius: 999,
            width: 16,
            height: 16,
            fontSize: 9,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}>
            {count}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header con navegación */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button
          onClick={() => onNavigate(-1)}
          style={{
            border: "1px solid var(--border)", background: "transparent", color: "var(--text)",
            borderRadius: 8, width: 32, height: 32, cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <i className="ti ti-chevron-left" style={{ fontSize: 16 }} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", fontFamily: "Syne, sans-serif" }}>
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={() => onNavigate(1)}
          style={{
            border: "1px solid var(--border)", background: "transparent", color: "var(--text)",
            borderRadius: 8, width: 32, height: 32, cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <i className="ti ti-chevron-right" style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Días de la semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DAY_NAMES.map((n) => (
          <div key={n} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.5px", paddingBottom: 4 }}>
            {n}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells}
      </div>
    </div>
  );
}

// ── Componente principal Dashboard ────────────────────────────────────────────
export default function Home() {
  const { primary } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [period, setPeriod] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);

  // ── Uber Eats Store Status ──
  const [uberStatus, setUberStatus] = useState(null); // "ONLINE" | "PAUSED" | null
  const [uberLoading, setUberLoading] = useState(false);
  const [uberSyncing, setUberSyncing] = useState(false);

  const fetchData = useCallback(async (p, cy, cm) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/dashboard-stats?period=${p}&calendarYear=${cy}&calendarMonth=${cm}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Error cargando dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period, calYear, calMonth);
  }, [period, calYear, calMonth, fetchData]);

  // ── Cargar estado de Uber Eats (solo admin) ──
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await apiFetch("/api/uber/store/status");
        if (res.ok) {
          const json = await res.json();
          setUberStatus(json.status || "ONLINE");
        }
      } catch (e) {
        console.error("Error cargando estado Uber:", e);
      }
    })();
  }, [isAdmin]);

  const handleUberToggle = async () => {
    const newStatus = uberStatus === "ONLINE" ? "PAUSED" : "ONLINE";
    setUberLoading(true);
    try {
      const res = await apiFetch("/api/uber/store/status", {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setUberStatus(newStatus);
      }
    } catch (e) {
      console.error("Error cambiando estado Uber:", e);
    } finally {
      setUberLoading(false);
    }
  };

  const handleUberMenuSync = async () => {
    setUberSyncing(true);
    try {
      await apiFetch("/api/uber/menu/sync", { method: "POST" });
    } catch (e) {
      console.error("Error sincronizando menú:", e);
    } finally {
      setUberSyncing(false);
    }
  };

  const handleCalendarNavigate = (dir) => {
    let newMonth = calMonth + dir;
    let newYear = calYear;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setCalMonth(newMonth);
    setCalYear(newYear);
  };

  const chartData = data?.sales?.chartData || [];
  const totals = data?.sales?.totals || { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 };
  const topProducts = data?.topProducts || [];
  const calendar = data?.calendar || { year: calYear, month: calMonth, pendingByDay: {} };

  // ── Barra más alta para calcular porcentaje en top products ──
  const maxQty = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.quantity)) : 1;

  // ── Skeleton loader ──
  const SkeletonBar = ({ width = "100%", height = 16, style = {} }) => (
    <div style={{
      width, height, borderRadius: 6,
      background: "linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }} />
  );

  return (
    <div className="page-container" style={{ animation: "fadein 0.3s ease" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── Header ── */}
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", fontFamily: "Syne, sans-serif", margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "var(--text2)", margin: "4px 0 0" }}>
            Resumen general de ventas y operaciones
          </p>
        </div>

        {/* ── Uber Eats Control Panel (solo Admin) ── */}
        {isAdmin && (
          <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, #1db954, #06d6a0)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <i className="ti ti-brand-uber" style={{ fontSize: 18, color: "#fff" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "Syne, sans-serif" }}>
                    Uber Eats
                  </span>
                  <span style={{
                    width: 6, height: 6, borderRadius: 999,
                    background: uberStatus === "ONLINE" ? "#10b981" : uberStatus === "PAUSED" ? "#f59e0b" : "#6b7280",
                    display: "inline-block",
                    boxShadow: uberStatus === "ONLINE" ? "0 0 6px rgba(16,185,129,0.5)" : "none",
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>
                  {uberStatus === "ONLINE" ? "Activa" : uberStatus === "PAUSED" ? "Pausada" : "Cargando..."}
                </span>
              </div>
            </div>

            <div style={{ width: 1, height: 24, background: "var(--border)" }} />

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={handleUberToggle}
                disabled={uberLoading || !uberStatus}
                title={uberStatus === "ONLINE" ? "Pausar Tienda" : "Activar Tienda"}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "none",
                  background: uberStatus === "ONLINE"
                    ? "rgba(249,115,22,0.1)"
                    : "rgba(16,185,129,0.1)",
                  color: uberStatus === "ONLINE" ? "#f97316" : "#10b981",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: uberLoading ? "not-allowed" : "pointer",
                  opacity: uberLoading ? 0.6 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                <i className={`ti ${uberStatus === "ONLINE" ? "ti-player-pause" : "ti-player-play"}`} style={{ fontSize: 16 }} />
              </button>

              <button
                onClick={handleUberMenuSync}
                disabled={uberSyncing}
                title="Sincronizar Menú"
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: uberSyncing ? "not-allowed" : "pointer",
                  opacity: uberSyncing ? 0.6 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                <i className={`ti ti-refresh ${uberSyncing ? "ti-loader" : ""}`} style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Ventas", value: fmt(totals.total), icon: "ti-chart-bar", gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
          { label: "Efectivo", value: fmt(totals.efectivo), icon: "ti-cash", gradient: "linear-gradient(135deg, #059669, #10b981)" },
          { label: "Tarjeta", value: fmt(totals.tarjeta), icon: "ti-credit-card", gradient: "linear-gradient(135deg, #2563eb, #3b82f6)" },
          { label: "Transferencia", value: fmt(totals.transferencia), icon: "ti-arrows-exchange", gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)" },
        ].map((c) => (
          <div
            key={c.label}
            className="card"
            style={{
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              cursor: "default",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: c.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <i className={`ti ${c.icon}`} style={{ fontSize: 20, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {c.label}
              </div>
              {loading ? (
                <SkeletonBar width={90} height={22} style={{ marginTop: 4 }} />
              ) : (
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.5px" }}>
                  {c.value}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Chart + Calendar ── */}
      <div className="dashboard-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 24 }}>

        {/* ═══ Gráfico de Ventas ═══ */}
        <div className="card" style={{ padding: "24px 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="ti ti-chart-bar" style={{ fontSize: 18, color: "#fff" }} />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", fontFamily: "Syne, sans-serif", margin: 0 }}>
                Ventas por Período
              </h2>
            </div>

            {/* Period Tabs */}
            <div style={{
              display: "flex", gap: 4,
              background: "var(--surface2)", borderRadius: 10, padding: 3,
            }}>
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  style={{
                    padding: "7px 14px", borderRadius: 8, border: "none",
                    background: period === key ? primary : "transparent",
                    color: period === key ? "#fff" : "var(--text2)",
                    fontWeight: 600, fontSize: 12, cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          {loading ? (
            <div style={{ height: 300, display: "flex", alignItems: "flex-end", gap: 12, padding: "0 20px" }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <SkeletonBar key={i} width="100%" height={80 + Math.random() * 150} />
              ))}
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
              <i className="ti ti-chart-bar-off" style={{ fontSize: 48, color: "var(--text2)", marginBottom: 12 }} />
              <p style={{ color: "var(--text2)", fontSize: 14 }}>Sin datos de ventas para este período</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text2)", fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text2)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface2)", radius: 4 }} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--text2)", fontSize: 12, fontWeight: 500 }}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </span>
                  )}
                />
                <Bar dataKey="efectivo" stackId="sales" fill={COLORS.efectivo} radius={[0, 0, 0, 0]} name="efectivo" />
                <Bar dataKey="tarjeta" stackId="sales" fill={COLORS.tarjeta} radius={[0, 0, 0, 0]} name="tarjeta" />
                <Bar dataKey="transferencia" stackId="sales" fill={COLORS.transferencia} radius={[4, 4, 0, 0]} name="transferencia" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ═══ Mini Calendario de Pendientes ═══ */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="ti ti-calendar-event" style={{ fontSize: 18, color: "#fff" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "Syne, sans-serif", margin: 0 }}>
                Pedidos Pendientes
              </h2>
              <p style={{ fontSize: 11, color: "var(--text2)", margin: 0 }}>
                Por fecha de entrega
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {Array.from({ length: 35 }).map((_, i) => (
                <SkeletonBar key={i} height={32} style={{ borderRadius: 8 }} />
              ))}
            </div>
          ) : (
            <MiniCalendar
              pendingByDay={calendar.pendingByDay}
              year={calendar.year}
              month={calendar.month}
              onNavigate={handleCalendarNavigate}
            />
          )}

          {/* Leyenda */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text2)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--primary)", display: "inline-block" }} /> Hoy
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text2)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444", display: "inline-block" }} /> Pendientes
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Top Products ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #ec4899, #f43f5e)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-trophy" style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", fontFamily: "Syne, sans-serif", margin: 0 }}>
              Productos Más Vendidos
            </h2>
            <p style={{ fontSize: 12, color: "var(--text2)", margin: 0 }}>
              Top 10 del mes actual
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBar key={i} height={40} />
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", opacity: 0.5 }}>
            <i className="ti ti-package-off" style={{ fontSize: 40, color: "var(--text2)", marginBottom: 8, display: "block" }} />
            <p style={{ color: "var(--text2)", fontSize: 14 }}>No hay ventas registradas este mes</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topProducts.map((p, i) => {
              const pct = (p.quantity / maxQty) * 100;
              const barColors = [
                "linear-gradient(90deg, #6366f1, #8b5cf6)",
                "linear-gradient(90deg, #3b82f6, #60a5fa)",
                "linear-gradient(90deg, #10b981, #34d399)",
                "linear-gradient(90deg, #f59e0b, #fbbf24)",
                "linear-gradient(90deg, #ec4899, #f472b6)",
              ];
              return (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "10px 14px", borderRadius: 10,
                    background: "var(--surface2)",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(4px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(0)"; }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: i < 3 ? barColors[i] : "var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: i < 3 ? "#fff" : "var(--text2)",
                    flexShrink: 0,
                  }}>
                    {p.rank}
                  </div>

                  {/* Name + Bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", flexShrink: 0, marginLeft: 8 }}>
                        {p.quantity} vendidos
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: barColors[i % barColors.length],
                        width: `${pct}%`,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>

                  {/* Revenue */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: primary, flexShrink: 0, minWidth: 70, textAlign: "right" }}>
                    {fmt(p.revenue)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


    </div>
  );
}