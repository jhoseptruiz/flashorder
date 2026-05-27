import { useEffect } from "react";
import Sidebar, { NAV }  from "./Sidebar";
import Config   from "../pages/Config";
import Home     from "../pages/Home";
import Usuarios from "../pages/Usuarios";


export default function Layout({ navKey, setNavKey, user, onLogout }) {
  useEffect(() => {
    if (user && navKey) {
      const currentNav = NAV.find(n => n.key === navKey);
      if (currentNav && currentNav.roles && !currentNav.roles.includes(user.role)) {
        // Redirect to default page based on role
        if (user.role === 'admin') setNavKey('dashboard');
        else if (user.role === 'empleado') setNavKey('pos');
        else if (user.role === 'cocinero') setNavKey('kitchen');
        else setNavKey('dashboard');
      }
    }
  }, [navKey, user, setNavKey]);

  const renderPage = () => {
    if (navKey === "config") return <Config />;
    if (navKey === "usuarios") return <Usuarios user={user} />;
    return <Home navKey={navKey} />;
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        navKey={navKey}
        setNavKey={setNavKey}
        user={user}
        onLogout={onLogout}
      />
      <main style={{ flex: 1, overflow: "auto", padding: "32px 36px", animation: "fadein 0.3s ease" }}>
        {renderPage()}
      </main>
    </div>
  );
}