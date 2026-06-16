import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../utils/apiFetch";

const formatCLP = (value) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value || 0);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Boleta({ order, onClose }) {
  const { appName, appLogo, primary, showToast } = useTheme();

  const companyName = order?.companyName || appName || "FlashOrder";
  const companyLogo = order?.companyLogo || appLogo;

  const totalAmount = useMemo(() => {
    if (!order?.OrderItems) return 0;
    return order.OrderItems.reduce((sum, item) => sum + (item.subtotal || item.quantity * item.unitPrice), 0);
  }, [order]);

  if (!order) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.64)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "min(820px, 100%)", maxHeight: "min(95vh, 100%)", overflowY: "auto", background: "var(--surface)", borderRadius: 20, boxShadow: "0 40px 120px rgba(15,23,42,0.24)", padding: 24, position: "relative" }}>
        <button
          type="button"
          onClick={onClose}
          style={{ position: "absolute", top: 18, right: 18, border: "none", background: "transparent", cursor: "pointer", color: "var(--text2)", fontSize: 20 }}
        >
          ×
        </button>

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: primary, fontWeight: 700, fontSize: 24 }}>{companyName?.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>Boleta</div>
              <h2 style={{ fontSize: 24, margin: 0, lineHeight: 1.1 }}>{companyName}</h2>
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right", minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>Pedido</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: primary }}>{order.id?.substring(0, 8).toUpperCase()}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>{formatDate(order.orderDate)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--surface2)" }}>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Cliente</div>
            <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{order.Customer?.fullName || "Cliente"}</div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>{order.Customer?.phone || "-"}</div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>{order.Customer?.email || "-"}</div>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 16, background: "var(--surface2)" }}>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>Entrega</div>
            <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{order.deliveryDate ? formatDate(order.deliveryDate) : "No definida"}</div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>Método: {order.paymentMethod || "No definido"}</div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 14, textAlign: "left", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>Producto</th>
                <th style={{ padding: 14, textAlign: "center", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>Cant.</th>
                <th style={{ padding: 14, textAlign: "right", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>Precio</th>
                <th style={{ padding: 14, textAlign: "right", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.OrderItems?.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--text)" }}>{item.productNameSnapshot}</td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", textAlign: "center", fontSize: 13, color: "var(--text)" }}>{item.quantity}</td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", textAlign: "right", fontSize: 13, color: "var(--text)" }}>{formatCLP(item.unitPrice)}</td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", textAlign: "right", fontSize: 13, color: "var(--text)" }}>{formatCLP(item.subtotal || item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div style={{ minWidth: 240, padding: 16, borderRadius: 16, background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "var(--text2)", fontSize: 12 }}>Total</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              <span>Total</span>
              <span>{formatCLP(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
