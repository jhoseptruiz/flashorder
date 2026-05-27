import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", padding: "32px 36px", animation: "fadein 0.3s ease" }}>
        <Outlet />
      </main>
    </div>
  );
}