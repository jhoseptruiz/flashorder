import Sidebar  from "./Sidebar";
import Config   from "../pages/Config";
import Home     from "../pages/Home";

export default function Layout({ navKey, setNavKey, user, onLogout }) {
  const renderPage = () => {
    if (navKey === "config") return <Config />;
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