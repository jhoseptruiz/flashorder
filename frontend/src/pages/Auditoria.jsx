import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/apiFetch";
import Boleta from "./Boleta";

// ── Mapeo de acciones a etiquetas legibles y colores ────────────────────────
const ACTION_MAP = {
  LOGIN:          { label: "Inicio de sesión",      icon: "ti-login",          color: "#3b82f6" },
  LOGOUT:         { label: "Cierre de sesión",      icon: "ti-logout",         color: "#64748b" },
  OPEN_REGISTER:  { label: "Inicio de turno",       icon: "ti-lock-open",      color: "#10b981" },
  CLOSE_REGISTER: { label: "Cierre de turno",       icon: "ti-lock",           color: "#f97316" },
  CREATE:         { label: "Creación",              icon: "ti-plus",           color: "#22c55e" },
  UPDATE:         { label: "Edición",               icon: "ti-edit",           color: "#f59e0b" },
  UPDATE_STATUS:  { label: "Cambio de estado",      icon: "ti-arrows-exchange",color: "#8b5cf6" },
  UPDATE_PROFILE: { label: "Cambio de perfil",      icon: "ti-user-edit",      color: "#06b6d4" },
  DELETE:         { label: "Eliminación",           icon: "ti-trash",          color: "#ef4444" },
};

// ── Mapeo de tablas a nombres amigables ───────────────────────────────────
const TABLE_MAP = {
  customer_orders: "Pedidos",
  users:           "Usuarios",
  products:        "Productos",
  categories:      "Categorías",
  cash_register_sessions: "Caja",
};

// ── Mapeo de estados de pedidos ───────────────────────────────────────────
const STATUS_MAP = {
  pendiente_uber: "Pendiente Uber",
  pendiente:      "Pendiente",
  en_cocina:      "En cocina",
  empacado:       "Empacado",
  entregado:      "Entregado",
};

function formatDate(isoString) {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function getOrderLabel(log) {
  const externalId = log.newData?.externalOrderId || log.oldData?.externalOrderId;
  const source = log.newData?.source || log.oldData?.source;
  if (externalId) return `pedido ${externalId}`;
  if (log.recordId) {
    const shortId = log.recordId.substring(0, 8).toUpperCase();
    const prefix = source === "uber_eats" ? "Uber" : "Local";
    return `pedido ${prefix} #${shortId}`;
  }
  return "pedido";
}

function buildDescription(log, isAdmin) {
  const action = log.action;
  const table = TABLE_MAP[log.tableAffected] || log.tableAffected;
  const userName = log.User?.fullName || log.userRut || "";

  if (action === "LOGIN") {
    return isAdmin && userName
      ? `${userName} inició sesión en el sistema`
      : "Iniciaste sesión en el sistema";
  }

  if (action === "LOGOUT") {
    return isAdmin && userName
      ? `${userName} cerró sesión`
      : "Cerraste sesión";
  }

  if (action === "OPEN_REGISTER") {
    return isAdmin && userName
      ? `${userName} inició turno (abrió caja)`
      : "Iniciaste turno (abriste caja)";
  }

  if (action === "CLOSE_REGISTER") {
    return isAdmin && userName
      ? `${userName} cerró turno (cerró caja)`
      : "Cerraste turno (cerraste caja)";
  }

  if (action === "UPDATE_STATUS" && log.oldData?.status && log.newData?.status) {
    const from = STATUS_MAP[log.oldData.status] || log.oldData.status;
    const to = STATUS_MAP[log.newData.status] || log.newData.status;
    const orderLabel = getOrderLabel(log);
    return `Cambió estado del ${orderLabel} de "${from}" a "${to}"`;
  }

  if (action === "UPDATE_PROFILE") {
    const fields = log.newData ? Object.keys(log.newData) : [];
    const mapped = fields.map((f) => {
      if (f === "password") return "contraseña";
      if (f === "full_name") return "nombre";
      if (f === "email") return "correo";
      if (f === "rut") return "RUT";
      return f;
    });
    const suffix = mapped.length > 0 ? ` (${mapped.join(", ")})` : "";
    return isAdmin && userName
      ? `${userName} actualizó su perfil${suffix}`
      : `Actualizaste tu perfil${suffix}`;
  }

  if (action === "CREATE") {
    const name = log.newData?.name || log.newData?.full_name || "";
    return `Creó un registro en ${table}${name ? `: ${name}` : ""}`;
  }

  if (action === "UPDATE") {
    const name = log.newData?.name || log.newData?.full_name || "";
    return `Editó un registro en ${table}${name ? `: ${name}` : ""}`;
  }

  if (action === "DELETE") {
    const name = log.oldData?.name || log.oldData?.rut || "";
    return `Eliminó un registro de ${table}${name ? `: ${name}` : ""}`;
  }

  return `${action} en ${table}`;
}

const FILTER_CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "turnos", label: "Apertura / Cierre de caja" },
  { id: "pedidos", label: "Pedidos" },
  { id: "otros", label: "Otros" }
];

export default function Auditoria() {
  const { primary, showToast } = useTheme();
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/audit-logs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar registros");
      setLogs(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar logs
  const filteredLogs = logs.filter((log) => {
    // 1. Filtro por categoría
    let matchesCategory = false;
    if (filter === "all") {
      matchesCategory = true;
    } else if (filter === "turnos") {
      matchesCategory = ["OPEN_REGISTER", "CLOSE_REGISTER"].includes(log.action);
    } else if (filter === "pedidos") {
      matchesCategory = log.tableAffected === "customer_orders";
    } else if (filter === "otros") {
      const isTurno = ["OPEN_REGISTER", "CLOSE_REGISTER"].includes(log.action);
      const isPedido = log.tableAffected === "customer_orders";
      matchesCategory = !isTurno && !isPedido;
    }

    // 2. Filtro por búsqueda de texto
    let matchesSearch = true;
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const userName = (log.User?.fullName || log.userRut || "").toLowerCase();
      const orderLabel = getOrderLabel(log).toLowerCase();
      const actionLabel = (ACTION_MAP[log.action]?.label || log.action).toLowerCase();
      const desc = buildDescription(log, isAdmin).toLowerCase();
      const recordIdStr = (log.recordId || "").toLowerCase();
      
      matchesSearch = userName.includes(query) || 
                      orderLabel.includes(query) || 
                      actionLabel.includes(query) ||
                      desc.includes(query) ||
                      recordIdStr.includes(query);
    }

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="page-container" style={{ maxWidth: 960, margin: "0 auto", animation: "fadein 0.3s ease" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
            {isAdmin ? "Auditoría del Sistema" : "Mi Actividad"}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
            {isAdmin
              ? "Historial completo de acciones de todos los usuarios"
              : "Historial de tus acciones en el sistema"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              minWidth: 28, height: 28, borderRadius: 999,
              background: primary, color: "#fff", fontSize: 12, fontWeight: 700, padding: "0 10px"
            }}>
              {filteredLogs.length}
            </span>
            <span style={{ fontSize: 13, color: "var(--text2)" }}>registros</span>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          style={{
            background: primary, color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 18px", fontWeight: 700,
            fontSize: 13, cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: 8,
            boxShadow: "0 10px 24px rgba(124,58,237,0.22)",
          }}
        >
          <i className="ti ti-refresh" />
          Actualizar
        </button>
      </div>

      {/* Barra de búsqueda y Filtros */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: 400 }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text2)", fontSize: 18 }} />
          <input
            type="text"
            placeholder="Buscar por usuario, acción o código de pedido..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ width: "100%", paddingLeft: 40, margin: 0 }}
          />
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {FILTER_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat.id}
              label={cat.label}
              active={filter === cat.id}
              onClick={() => setFilter(cat.id)}
              primary={primary}
            />
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>
            <div style={{
              width: 36, height: 36, border: "3px solid var(--border)",
              borderTopColor: primary, borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px"
            }} />
            Cargando registros...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>
            <i className="ti ti-clipboard-list" style={{ fontSize: 40, display: "block", marginBottom: 10, opacity: 0.4 }} />
            No hay registros de auditoría
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredLogs.map((log, idx) => {
              const actionInfo = ACTION_MAP[log.action] || { label: log.action, icon: "ti-point", color: "#6b7280" };
              const isExpanded = expandedId === log.id;
              const userName = log.User?.fullName || log.userRut;

              const canExpand = (log.tableAffected === "customer_orders" && log.action === "UPDATE_STATUS") || (log.action === "CLOSE_REGISTER");

              return (
                <div
                  key={log.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: idx < filteredLogs.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: canExpand ? "pointer" : "default",
                    transition: "background 0.15s",
                    background: isExpanded ? "var(--surface2)" : "transparent",
                  }}
                  onClick={() => { if (canExpand) setExpandedId(isExpanded ? null : log.id); }}
                  onMouseEnter={(e) => { if (canExpand && !isExpanded) e.currentTarget.style.background = "var(--surface2)"; }}
                  onMouseLeave={(e) => { if (canExpand && !isExpanded) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Ícono de acción */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: `${actionInfo.color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <i className={`ti ${actionInfo.icon}`} style={{ fontSize: 18, color: actionInfo.color }} />
                    </div>

                    {/* Info principal */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                          {buildDescription(log, isAdmin)}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
                        {isAdmin && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 12, color: "var(--text2)"
                          }}>
                            <i className="ti ti-user" style={{ fontSize: 13 }} />
                            {userName}
                            {log.User?.role && (
                              <span style={{
                                marginLeft: 4, padding: "1px 6px", borderRadius: 999,
                                fontSize: 10, fontWeight: 600,
                                background: log.User.role === "admin" ? "#dbeafe" :
                                  log.User.role === "cocinero" ? "#ffe3b3" : "#f9c7d1",
                                color: "#4b1f2f",
                              }}>
                                {log.User.role}
                              </span>
                            )}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "var(--text2)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <i className="ti ti-clock" style={{ fontSize: 13 }} />
                          {formatDate(log.createdAt)}
                        </span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 999,
                          fontSize: 10, fontWeight: 600,
                          background: `${actionInfo.color}18`, color: actionInfo.color,
                        }}>
                          {actionInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Chevron (solo si es expandible) */}
                    {canExpand && (
                      <i
                        className={`ti ti-chevron-${isExpanded ? "up" : "down"}`}
                        style={{ fontSize: 16, color: "var(--text2)", flexShrink: 0, transition: "transform 0.2s" }}
                      />
                    )}
                  </div>

                  {/* Detalle expandible (Formato Boleta / Cierre de Turno) */}
                  {isExpanded && canExpand && (
                    <div style={{
                      marginTop: 14, paddingTop: 14,
                      borderTop: "1px dashed var(--border)",
                      animation: "fadein 0.2s ease",
                    }}>
                      {log.action === "CLOSE_REGISTER" ? (
                        <ShiftReportTicket log={log} primary={primary} />
                      ) : (
                        <OrderTicket log={log} primary={primary} onSelectBoleta={(order) => setSelectedInvoice(order)} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedInvoice && (
        <Boleta order={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? `1.5px solid ${primary}` : "1.5px solid var(--border)",
        background: active ? `${primary}18` : "var(--surface)",
        color: active ? primary : "var(--text2)",
        borderRadius: 999,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.18s",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {label}
    </button>
  );
}

function OrderTicket({ log, primary, onSelectBoleta }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        if (!log.recordId) throw new Error("ID de pedido no disponible");
        const res = await apiFetch(`/api/orders/${log.recordId}`);
        if (!res.ok) throw new Error("No se pudo cargar el pedido");
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [log.recordId]);

  return (
    <div style={{
      background: "var(--bg)", 
      padding: 20, 
      borderRadius: 12, 
      border: "1px solid var(--border)",
      maxWidth: 400,
      margin: "0 auto",
      boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
    }}>
      <div style={{ textAlign: "center", marginBottom: 15 }}>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1 }}>
          Ticket de Pedido
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--text2)", fontSize: 13 }}>
          <div style={{
            width: 20, height: 20, border: "2px solid var(--border)",
            borderTopColor: primary, borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 8px"
          }} />
          Cargando detalles...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "20px", color: "#ef4444", fontSize: 13 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
          {error}
        </div>
      ) : (
        <>
          <div style={{ 
            borderTop: "1px dashed var(--border)", 
            borderBottom: "1px dashed var(--border)", 
            padding: "12px 0", 
            marginBottom: 12, 
            fontSize: 13,
            fontFamily: "'DM Mono', 'Fira Code', monospace"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--text2)" }}>Identificador:</span>
              <strong style={{ color: "var(--text)" }}>{getOrderLabel(log).replace("pedido ", "").toUpperCase()}</strong>
            </div>
            {order.Customer && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "var(--text2)" }}>Cliente:</span>
                  <span style={{ color: "var(--text)", textAlign: "right" }}>{order.Customer.fullName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text2)" }}>Teléfono:</span>
                  <span style={{ color: "var(--text)", textAlign: "right" }}>{order.Customer.phone || "N/A"}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ 
            marginBottom: 12, 
            fontSize: 13,
            fontFamily: "'DM Mono', 'Fira Code', monospace"
          }}>
            <div style={{ fontWeight: 600, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5 }}>
              Detalle
            </div>
            {order.OrderItems?.map((item) => {
              const name = item.productNameSnapshot || `${item.ProductVariant?.product?.name || "Producto"} - ${item.ProductVariant?.variantName || ""}`;
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "var(--text)", flex: 1, paddingRight: 10 }}>
                    {item.quantity}x {name}
                  </span>
                  <span style={{ color: "var(--text)" }}>
                    ${(Number(item.unitPrice) * item.quantity).toLocaleString("es-CL")}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ 
            borderTop: "1px dashed var(--border)", 
            paddingTop: 12, 
            display: "flex", 
            justifyContent: "space-between",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "'DM Mono', 'Fira Code', monospace"
          }}>
            <span style={{ color: "var(--text)" }}>TOTAL</span>
            <span style={{ color: primary }}>${Number(order.totalAmount).toLocaleString("es-CL")}</span>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const printWindow = window.open('', '_blank', 'width=600,height=600');
                const itemsHtml = order.OrderItems?.map(item => `
                  <div class="flex" style="margin-bottom: 6px;">
                    <span>${item.quantity}x ${item.productNameSnapshot}</span>
                    <span>$${(Number(item.unitPrice) * item.quantity).toLocaleString("es-CL")}</span>
                  </div>
                `).join('') || '';

                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Ticket de Pedido</title>
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
                        <h3>FlashOrder</h3>
                        <p>TICKET DE PEDIDO</p>
                      </div>
                      <hr />
                      <div class="flex"><span>Identificador:</span> <span class="bold">${getOrderLabel(log).replace("pedido ", "").toUpperCase()}</span></div>
                      \${order.Customer ? \`
                        <div class="flex"><span>Cliente:</span> <span>\${order.Customer.fullName}</span></div>
                        <div class="flex"><span>Teléfono:</span> <span>\${order.Customer.phone || "N/A"}</span></div>
                      \` : ''}
                      <hr />
                      <div class="bold" style="margin-bottom: 8px;">DETALLE:</div>
                      \${itemsHtml}
                      <hr />
                      <div class="flex bold" style="font-size: 15px;">
                        <span>TOTAL</span>
                        <span>$ \${Number(order.totalAmount).toLocaleString("es-CL")}</span>
                      </div>
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
                flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${primary}`,
                background: "transparent", color: primary, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "inline-flex",
                alignItems: "center", justifyContent: "center", gap: 6
              }}
            >
              <i className="ti ti-printer" /> Imprimir Ticket
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectBoleta(order);
              }}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 8, border: "none",
                background: `linear-gradient(135deg, ${primary}, ${primary}dd)`,
                color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "inline-flex",
                alignItems: "center", justifyContent: "center", gap: 6
              }}
            >
              <i className="ti ti-receipt" /> Ver Boleta
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ShiftReportTicket({ log, primary }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSessionDetails() {
      try {
        setLoading(true);
        if (!log.recordId) throw new Error("ID de turno no disponible");
        const res = await apiFetch(`/api/cash-register/sessions/${log.recordId}`);
        if (!res.ok) throw new Error("No se pudo cargar el detalle del turno");
        const data = await res.json();
        setSession(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSessionDetails();
  }, [log.recordId]);

  const fmtVal = (n) => `$${Number(n || 0).toLocaleString("es-CL")}`;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "var(--text2)", fontSize: 13 }}>
        <div style={{
          width: 20, height: 20, border: "2px solid var(--border)",
          borderTopColor: primary, borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 8px"
        }} />
        Cargando detalles de turno...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#ef4444", fontSize: 13 }}>
        <i className="ti ti-alert-circle" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
        {error}
      </div>
    );
  }

  const diff = Number(session.difference) || 0;
  const expected = Number(session.expectedCash) || 0;
  const opening = Number(session.openingCash) || 0;
  const closing = Number(session.closingCash) || 0;

  return (
    <div style={{
      background: "var(--bg)", 
      padding: 20, 
      borderRadius: 12, 
      border: "1px solid var(--border)",
      maxWidth: 400,
      margin: "0 auto",
      boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
    }}>
      <div style={{ textAlign: "center", marginBottom: 15 }}>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1 }}>
          Resumen de Cierre de Turno
        </p>
      </div>

      <div style={{ 
        borderTop: "1px dashed var(--border)", 
        borderBottom: "1px dashed var(--border)", 
        padding: "12px 0", 
        marginBottom: 12, 
        fontSize: 13,
        fontFamily: "'DM Mono', 'Fira Code', monospace"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "var(--text2)" }}>Monto Inicio:</span>
          <strong style={{ color: "var(--text)" }}>{fmtVal(opening)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "var(--text2)" }}>Efectivo Esperado:</span>
          <strong style={{ color: "var(--text)" }}>{fmtVal(expected)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "var(--text2)" }}>Monto Cierre (Real):</span>
          <strong style={{ color: "var(--text)" }}>{fmtVal(closing)}</strong>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          marginTop: 6,
          paddingTop: 6,
          borderTop: "1px solid var(--border)",
          color: diff === 0 ? "#15803d" : diff > 0 ? "#1d4ed8" : "#dc2626"
        }}>
          <span style={{ fontWeight: 600 }}>Diferencia:</span>
          <strong style={{ fontWeight: 700 }}>
            {diff === 0 ? "✓ Cuadre" : diff > 0 ? `+${fmtVal(diff)}` : fmtVal(diff)}
          </strong>
        </div>
      </div>

      <div style={{ 
        marginBottom: 12, 
        fontSize: 13,
        fontFamily: "'DM Mono', 'Fira Code', monospace"
      }}>
        <div style={{ fontWeight: 600, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5 }}>
          Desglose de Ventas del Turno
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "var(--text)" }}>Efectivo</span>
          <span style={{ color: "var(--text)" }}>{fmtVal(session.breakdown?.efectivo)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "var(--text)" }}>Transferencia</span>
          <span style={{ color: "var(--text)" }}>{fmtVal(session.breakdown?.transferencia)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "var(--text)" }}>Tarjeta</span>
          <span style={{ color: "var(--text)" }}>{fmtVal(session.breakdown?.tarjeta)}</span>
        </div>
        <div style={{ 
          borderTop: "1px solid var(--border)", 
          paddingTop: 6, 
          marginTop: 6,
          display: "flex", 
          justifyContent: "space-between",
          fontWeight: 700
        }}>
          <span style={{ color: "var(--text)" }}>Total Ventas</span>
          <span style={{ color: primary }}>{fmtVal(session.breakdown?.totalSales)}</span>
        </div>
      </div>

      {session.notes && (
        <div style={{
          fontSize: 11, color: "var(--text2)", fontStyle: "italic",
          paddingTop: 8, borderTop: "1px dashed var(--border)",
          wordBreak: "break-word", marginBottom: 12
        }}>
          📝 Obs: {session.notes}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
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
                  <h3>FlashOrder</h3>
                  <p>RESUMEN DE CIERRE DE CAJA</p>
                </div>
                <hr />
                <div class="flex"><span>Monto Inicial:</span> <span class="bold">${fmtVal(opening)}</span></div>
                <div class="flex"><span>Efectivo Esperado:</span> <span class="bold">${fmtVal(expected)}</span></div>
                <div class="flex"><span>Efectivo Contado (Real):</span> <span class="bold">${fmtVal(closing)}</span></div>
                <hr />
                <div class="flex bold">
                  <span>Diferencia:</span>
                  <span>${diff === 0 ? "Cuadre" : diff > 0 ? `+${fmtVal(diff)}` : fmtVal(diff)}</span>
                </div>
                <hr />
                <div class="bold" style="margin-bottom: 5px;">DESGLOSE VENTAS DEL TURNO:</div>
                <div class="flex"><span>Efectivo:</span> <span>${fmtVal(session.breakdown?.efectivo)}</span></div>
                <div class="flex"><span>Transferencia:</span> <span>${fmtVal(session.breakdown?.transferencia)}</span></div>
                <div class="flex"><span>Tarjeta:</span> <span>${fmtVal(session.breakdown?.tarjeta)}</span></div>
                <hr />
                <div class="flex bold"><span>Total Ventas:</span> <span>${fmtVal(session.breakdown?.totalSales)}</span></div>
                \${session.notes ? \`<hr /><div>Obs: \${session.notes}</div>\` : ''}
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
          width: "100%", marginTop: 14, padding: "10px 14px", borderRadius: 8, border: `1px solid ${primary}`,
          background: "transparent", color: primary, fontSize: 12, fontWeight: 600,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "inline-flex",
          alignItems: "center", justifyContent: "center", gap: 6
        }}
      >
        <i className="ti ti-printer" /> Imprimir Resumen
      </button>
    </div>
  );
}
