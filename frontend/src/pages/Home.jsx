const NAV_LABELS = {
  dashboard: "Dashboard",
  pos:       "Punto de Venta",
  kitchen:   "Cocina",
  orders:    "Pedidos y Calendario",
  clients:   "Clientes CRM",
  invoices:  "Boletas y Facturas",
};

export default function Home({ navKey }) {
  const label = NAV_LABELS[navKey] || "Dashboard";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16, opacity: 0.4 }}>
      <i className="ti ti-hammer" style={{ fontSize: 52, color: "var(--text2)" }} />
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>{label}</h2>
        <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>Esta sección está en construcción</p>
      </div>
    </div>
  );
}