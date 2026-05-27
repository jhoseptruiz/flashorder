import { useState } from "react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Login   from "./pages/Login";
import Layout  from "./components/Layout";
import "./styles/global.css";

function Inner() {
  const { dark, primary, primaryLight, toast } = useTheme();
  const [user, setUser]     = useState(null);
  const [navKey, setNavKey] = useState("dashboard");

  const cssVars = {
    "--primary":       primary,
    "--primary-light": primaryLight,
  };

  return (
    <div
      className={dark ? "dark-mode" : "light-mode"}
      style={{ ...cssVars, minHeight: "100vh" }}
    >
      {toast && (
        <div className={`toast toast--${toast.type}`}>
          <i className={`ti ${toast.type === "success" ? "ti-circle-check" : "ti-circle-x"}`} />
          {toast.msg}
        </div>
      )}

      {!user ? (
        <Login onLogin={(u) => setUser(u)} />
      ) : (
        <Layout
          navKey={navKey}
          setNavKey={setNavKey}
          user={user}
          onLogout={() => { setUser(null); setNavKey("dashboard"); }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Inner />
    </ThemeProvider>
  );
}