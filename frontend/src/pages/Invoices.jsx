import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../utils/apiFetch";
import Boleta from "./Boleta";

const formatCLP = (value) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value || 0);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function Invoices() {
  const { primary, showToast } = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [sortDirection, setSortDirection] = useState("desc");

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (search.trim()) params.set("search", search.trim());
      if (sortDirection) params.set("sort", sortDirection);

      const res = await apiFetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar las boletas");
      setInvoices(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [startDate, endDate, sortDirection]);

  const totalInvoices = useMemo(() => invoices.length, [invoices]);

  return (
    <div className="page-container" style={{ maxWidth: 1180, margin: "0 auto", animation: "fadein 0.3s ease" }}>
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Boletas y Facturas</h1>
          <p style={{ fontSize: 14, color: "var(--text2)", margin: 0 }}>Busca por cliente, producto, categoría y filtra por rango de fechas.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
            style={{ border: "none", borderRadius: 10, background: primary, color: "#fff", padding: "12px 16px", cursor: "pointer", fontWeight: 700 }}
          >
            Ordenar por fecha: {sortDirection === "desc" ? "Más nuevas" : "Más antiguas"}
          </button>
          <button
            type="button"
            onClick={loadInvoices}
            style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", color: "var(--text)", padding: "12px 16px", cursor: "pointer" }}
          >
            Actualizar
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--text2)" }}>Desde</label>
          <input
            type="date"
            className="input-field"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--text2)" }}>Hasta</label>
          <input
            type="date"
            className="input-field"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div style={{ minWidth: 240 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--text2)" }}>Buscar</label>
          <div style={{ position: "relative" }}>
            <i className="ti ti-search" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text2)", fontSize: 16 }} />
            <input
              type="search"
              className="input-field"
              placeholder="Cliente, producto o categoría"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  loadInvoices();
                }
              }}
              style={{ paddingLeft: 42 }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
        <div style={{ color: "var(--text2)", fontSize: 13 }}>{totalInvoices} boletas encontradas</div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {loading ? (
          <div style={{ padding: 20, color: "var(--text2)" }}>Cargando boletas...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: 20, color: "var(--text2)" }}>No se encontraron boletas con esos criterios.</div>
        ) : (
          invoices.map((order) => (
            <article key={order.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Pedido #{order.id.substring(0, 8).toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>{formatDate(order.orderDate)} • {order.Customer?.fullName || "Cliente"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: primary }}>{formatCLP(order.totalAmount)}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>{order.orderDate ? formatDate(order.orderDate) : "Sin fecha"}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                {order.OrderItems?.slice(0, 3).map((item) => (
                  <div key={item.id} style={{ borderRadius: 12, background: "var(--surface2)", padding: 10, fontSize: 12, color: "var(--text2)" }}>
                    <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>{item.productNameSnapshot}</strong>
                    {item.quantity} x {formatCLP(item.unitPrice)}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(order)}
                  style={{ border: "none", borderRadius: 10, background: primary, color: "#fff", padding: "12px 16px", cursor: "pointer", fontWeight: 700 }}
                >
                  Ver boleta
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await apiFetch(`/api/invoices/${order.id}/pdf`, { method: "GET" });
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || "No se pudo descargar el PDF");
                      }
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `boleta-${order.id}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      showToast(err.message || "Error al descargar PDF", "error");
                    }
                  }}
                  style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", color: "var(--text)", padding: "12px 14px", cursor: "pointer" }}
                >
                  Descargar
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {selectedInvoice && (
        <Boleta order={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}
