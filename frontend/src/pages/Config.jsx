import { useMemo } from "react";
import { useTheme, COLORS } from "../context/ThemeContext";

export default function Config() {
  const {
    dark,
    setDark,
    color,
    setColor,
    primary,
    primaryLight,
    showToast,
    appName,
    setAppName,
    appLogo,
    setAppLogo,
  } = useTheme();

  const logoPreview = useMemo(() => {
    if (!appLogo) return null;
    return appLogo;
  }, [appLogo]);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAppLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    showToast("Configuración actualizada correctamente", "success");
  };

  return (
    <div style={{ maxWidth: 760, animation: "fadein 0.3s ease" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
          Configuración del Sistema
        </h1>
        <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
          Personaliza la identidad y preferencias de FlashOrder
        </p>
      </div>

      {/* Card identidad */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <i className="ti ti-palette" style={{ fontSize: 20, color: "var(--text2)" }} />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}>Identidad del Negocio</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>

          {/* Nombre */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)", display: "block", marginBottom: 8 }}>
              Nombre de la Aplicación
            </label>
            <input
              className="input-field"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="FlashOrder"
            />
          </div>

          {/* Colores */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)", display: "block", marginBottom: 8 }}>
              Color Principal (Tema)
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {Object.entries(COLORS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setColor(key)}
                  title={val.name}
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: val.hex, cursor: "pointer",
                    border: color === key ? "3px solid var(--text)" : "3px solid transparent",
                    outline: color === key ? `2px solid ${val.hex}` : "none",
                    outlineOffset: 2,
                    transition: "all 0.15s",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Logo */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)", display: "block", marginBottom: 8 }}>
              Icono / Logo de la Aplicación
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 10,
                border: "1.5px dashed var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface2)",
                overflow: "hidden",
              }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <i className="ti ti-photo" style={{ fontSize: 22, color: "var(--text2)" }} />
                )}
              </div>
              <label style={{
                background: primary,
                color: "#fff",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <i className="ti ti-upload" style={{ fontSize: 15 }} />
                Seleccionar archivo
                <input type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
              </label>
              <button
                type="button"
                onClick={() => {
                  setAppLogo(null);
                  showToast("Logo descartado", "success");
                }}
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Eliminar logo
              </button>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>PNG, JPG</span>
            </div>
          </div>

          {/* Tema */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)", display: "block", marginBottom: 8 }}>
              Tema de la Interfaz
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setDark(false)}
                style={{
                  flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: `1.5px solid ${!dark ? primary : "var(--border)"}`,
                  background: !dark ? primaryLight : "var(--surface)",
                  color: !dark ? primary : "var(--text2)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.18s", fontFamily: "DM Sans, sans-serif",
                }}
              >
                <i className="ti ti-sun" style={{ fontSize: 16 }} />Claro
              </button>
              <button
                onClick={() => setDark(true)}
                style={{
                  flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: `1.5px solid ${dark ? primary : "var(--border)"}`,
                  background: dark ? primaryLight : "var(--surface)",
                  color: dark ? primary : "var(--text2)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.18s", fontFamily: "DM Sans, sans-serif",
                }}
              >
                <i className="ti ti-moon" style={{ fontSize: 16 }} />Oscuro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guardar */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-primary" onClick={save}>
          <i className="ti ti-device-floppy" style={{ fontSize: 18 }} />
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}