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

  const { itemsTotal, finalTotal, discount } = useMemo(() => {
    if (!order?.OrderItems) return { itemsTotal: 0, finalTotal: 0, discount: 0 };
    const sum = order.OrderItems.reduce((s, item) => s + (item.subtotal || item.quantity * item.unitPrice), 0);
    const final = order.totalAmount ?? sum;
    return {
      itemsTotal: sum,
      finalTotal: final,
      discount: Math.max(0, sum - final),
    };
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

        <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              const printWindow = window.open('', '_blank', 'width=800,height=800');
              const itemsHtml = order.OrderItems?.map(item => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 12px 8px; font-size: 13px;">${item.productNameSnapshot}</td>
                  <td style="padding: 12px 8px; font-size: 13px; text-align: center;">${item.quantity}</td>
                  <td style="padding: 12px 8px; font-size: 13px; text-align: right;">$${Number(item.unitPrice).toLocaleString("es-CL")}</td>
                  <td style="padding: 12px 8px; font-size: 13px; text-align: right;">$${Number(item.subtotal || item.quantity * item.unitPrice).toLocaleString("es-CL")}</td>
                </tr>
              `).join('') || '';

              printWindow.document.write(`
                <html>
                  <head>
                    <title>Boleta - ${order.id?.substring(0, 8).toUpperCase()}</title>
                    <style>
                      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
                      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                      .company-info { display: flex; align-items: center; gap: 15px; }
                      .logo { width: 60px; height: 60px; border-radius: 12px; background: #eee; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; color: ${primary}; }
                      .logo img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
                      .title { font-size: 22px; margin: 0; }
                      .order-info { text-align: right; }
                      .order-id { font-weight: bold; font-size: 18px; color: ${primary}; }
                      .date { font-size: 12px; color: #666; margin-top: 4px; }
                      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                      .panel { border: 1px solid #eee; border-radius: 12px; padding: 15px; background: #fafafa; }
                      .panel-title { font-size: 12px; color: #666; margin-bottom: 8px; text-transform: uppercase; }
                      .panel-body { font-weight: bold; font-size: 14px; }
                      .panel-desc { font-size: 12px; color: #666; margin-top: 4px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                      th { padding: 12px; text-align: left; font-size: 12px; color: #666; border-bottom: 2px solid #eee; }
                      .total-container { display: flex; justify-content: flex-end; }
                      .total-box { min-width: 240px; padding: 15px; border-radius: 12px; background: #fafafa; border: 1px solid #eee; }
                      .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <div class="company-info">
                        <div class="logo">
                          ${companyLogo ? `<img src="${companyLogo}" />` : companyName?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style="font-size: 12px; color: #666; margin-bottom: 2px;">Boleta</div>
                          <h2 class="title">${companyName}</h2>
                        </div>
                      </div>
                      <div class="order-info">
                        <div style="font-size: 12px; color: #666; margin-bottom: 2px;">Pedido</div>
                        <div class="order-id">${order.id?.substring(0, 8).toUpperCase()}</div>
                        <div class="date">${formatDate(order.orderDate)}</div>
                      </div>
                    </div>

                    <div class="grid">
                      <div class="panel">
                        <div class="panel-title">Cliente</div>
                        <div class="panel-body">${order.Customer?.fullName || "Cliente"}</div>
                        <div class="panel-desc">${order.Customer?.phone || "-"}</div>
                        <div class="panel-desc">${order.Customer?.email || "-"}</div>
                      </div>
                      <div class="panel">
                        <div class="panel-title">Entrega</div>
                        <div class="panel-body">${order.deliveryDate ? formatDate(order.deliveryDate) : "No definida"}</div>
                        <div class="panel-desc">Método: ${order.paymentMethod || "No definido"}</div>
                      </div>
                    </div>

                    <table>
                      <thead>
                        <tr>
                          <th style="text-align: left;">Producto</th>
                          <th style="text-align: center; width: 60px;">Cant.</th>
                          <th style="text-align: right; width: 100px;">Precio</th>
                          <th style="text-align: right; width: 120px;">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>

                    <div class="total-container">
                      <div class="total-box">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #666; font-size: 12px;">Resumen</div>
                        ${discount > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #666;">
                          <span>Subtotal</span>
                          <span>$${itemsTotal.toLocaleString("es-CL")}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #dc2626;">
                          <span>Descuento</span>
                          <span>-$${discount.toLocaleString("es-CL")}</span>
                        </div>
                        ` : ''}
                        <div class="total-row">
                          <span>Total</span>
                          <span>$${finalTotal.toLocaleString("es-CL")}</span>
                        </div>
                      </div>
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
              border: "none", borderRadius: 10, background: "linear-gradient(135deg, #059669, #10b981)",
              color: "#fff", padding: "12px 20px", cursor: "pointer", fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 8
            }}
          >
            <i className="ti ti-printer" /> Imprimir Boleta
          </button>

          <div style={{ minWidth: 240, padding: 16, borderRadius: 16, background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "var(--text2)", fontSize: 12 }}>Resumen</div>
            {discount > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text)", marginBottom: 4 }}>
                  <span>Subtotal</span>
                  <span>{formatCLP(itemsTotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#dc2626", marginBottom: 8 }}>
                  <span>Descuento</span>
                  <span>-{formatCLP(discount)}</span>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "var(--text)", borderTop: discount > 0 ? "1px solid var(--border)" : "none", paddingTop: discount > 0 ? 8 : 0 }}>
              <span>Total</span>
              <span>{formatCLP(finalTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
