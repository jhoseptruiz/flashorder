import { useTheme } from "../context/ThemeContext";


function getNav(user) {
  const nav = [
    { icon: "ti-layout-dashboard", label: "Dashboard",           key: "dashboard" },
    { icon: "ti-shopping-cart",    label: "Punto de Venta",      key: "pos"       },
    { icon: "ti-chef-hat",         label: "Cocina",              key: "kitchen"   },
    { icon: "ti-calendar",         label: "Pedidos y Calendario", key: "orders"   },
    //{ icon: "ti-users",            label: "Clientes CRM",        key: "clients"   },
    { icon: "ti-receipt",          label: "Boletas y Facturas",  key: "invoices"  },
  ];
  if (user?.role === "admin") {
    nav.push({ icon: "ti-users", label: "Usuarios", key: "usuarios" });
    nav.push({ icon: "ti-settings", label: "Configuración", key: "config" });
  }
  return nav;
}

export default function Sidebar({ navKey, setNavKey, user, onLogout }) {
  const { primary, appName, appLogo } = useTheme();
  const NAV = getNav(user);

  return (
    <aside style={{
      width: 220,
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "20px 12px",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px", marginBottom: 28 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          {appLogo ? (
            <img src={appLogo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <i className="ti ti-bolt" style={{ fontSize: 18, color: "#fff" }} />
          )}
        </div>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {appName}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`nav-item${navKey === n.key ? " active" : ""}`}
            onClick={() => setNavKey(n.key)}
          >
            <i className={`ti ${n.icon}`} style={{ fontSize: 18 }} />
            {n.label}
          </button>
        ))}
      </nav>

      {/* Usuario */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: primary, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 14, fontWeight: 600,
            color: "#fff", flexShrink: 0,
          }}>
            {(user?.name || user?.full_name || user?.email || "U")?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name || user?.full_name || user?.email || "Usuario"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text2)" }}>{user?.role}</div>
          </div>
        </div>
        <button className="nav-item danger" onClick={onLogout}>
          <i className="ti ti-logout" style={{ fontSize: 18 }} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}