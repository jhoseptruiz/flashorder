import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-layout" style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main" style={{ flex: 1, overflow: "auto", padding: "32px 36px", animation: "fadein 0.3s ease" }}>
        <div className="mobile-header">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <i className={`ti ${sidebarOpen ? "ti-menu-alt-x" : "ti-menu"}`} />
          </button>
        </div>
        <Outlet />
      </main>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}