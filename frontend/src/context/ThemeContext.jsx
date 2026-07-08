import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "flashorder-config";

export const COLORS = {
  purple: { hex: "#7c3aed", light: "#ede9fe", name: "Púrpura" },
  blue:   { hex: "#2563eb", light: "#dbeafe", name: "Azul" },
  green:  { hex: "#16a34a", light: "#dcfce7", name: "Verde" },
  orange: { hex: "#ea580c", light: "#ffedd5", name: "Naranja" },
  red:    { hex: "#dc2626", light: "#fee2e2", name: "Rojo" },
};

const defaultState = {
  dark: false,
  color: "purple",
  appName: "FlashOrder",
  appLogo: null,
};

function loadConfig() {
  if (typeof window === "undefined") return defaultState;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return stored ? { ...defaultState, ...stored } : defaultState;
  } catch (error) {
    return defaultState;
  }
}


export function ThemeProvider({ children }) {
  const initialState = loadConfig();
  const [dark, setDark] = useState(initialState.dark);
  const [color, setColor] = useState(initialState.color);
  const [appName, setAppName] = useState(initialState.appName);
  const [appLogo, setAppLogo] = useState(initialState.appLogo);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dark, color, appName, appLogo })
      );
    } catch (error) {
      console.warn("No se pudo guardar la configuración:", error);
    }
  }, [dark, color, appName, appLogo]);

  const primary = COLORS[color].hex;
  const primaryLight = COLORS[color].light;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <ThemeContext.Provider value={{
      dark,
      setDark,
      color,
      setColor,
      appName,
      setAppName,
      appLogo,
      setAppLogo,
      primary,
      primaryLight,
      toast,
      showToast,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}