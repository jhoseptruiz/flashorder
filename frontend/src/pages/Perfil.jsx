import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../utils/apiFetch";

const ROLES = {
  empleado: { label: "Empleado", color: "#f9c7d1" },
  cocinero: { label: "Cocinero", color: "#ffe3b3" },
  admin: { label: "Administrador", color: "#d0e2ff" },
};

const EMPTY_FORM = {
  rut: "",
  full_name: "",
  email: "",
  role: "",
};

const EMPTY_MODAL = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeRut = (raw) =>
  String(raw || "")
    .replace(/[\.\-]/g, "")
    .replace(/[^0-9kK]/gi, "")
    .toUpperCase();

const formatRut = (raw) => {
  const clean = normalizeRut(raw);
  if (clean.length <= 1) return clean;

  const dv = clean.slice(-1);
  let body = clean.slice(0, -1);
  const parts = [];

  while (body.length > 3) {
    parts.unshift(body.slice(-3));
    body = body.slice(0, -3);
  }

  if (body) parts.unshift(body);
  return `${parts.join(".")}-${dv}`;
};

const validateRut = (raw) => {
  const clean = normalizeRut(raw);
  return /^[0-9]+[0-9kK]$/.test(clean) && clean.length >= 8 && clean.length <= 10;
};

const validateEmail = (value) => EMAIL_REGEX.test(String(value || "").trim().toLowerCase());

const statusStyle = (type) => ({
  marginTop: 4,
  fontSize: 12,
  color: type === "success" ? "#166534" : "#b91c1c",
});

export default function Perfil() {
  const { user, login } = useAuth();
  const { primary, showToast } = useTheme();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [modalForm, setModalForm] = useState(EMPTY_MODAL);
  const [modalStatus, setModalStatus] = useState({ message: "", type: "" });
  const [rutStatus, setRutStatus] = useState({ message: "", type: "" });
  const [emailStatus, setEmailStatus] = useState({ message: "", type: "" });

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/api/users/me");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo cargar el perfil");
      }

      setForm({
        rut: formatRut(data.rut),
        full_name: data.full_name,
        email: data.email,
        role: data.role,
      });
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRutChange = (event) => {
    const rawValue = event.target.value;
    const formattedValue = formatRut(rawValue);
    setForm((current) => ({ ...current, rut: formattedValue }));
    setRutStatus({ message: "", type: "" });
  };

  const handleEmailChange = (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, email: value }));
    setEmailStatus({ message: "", type: "" });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "rut") {
      handleRutChange(event);
      return;
    }

    if (name === "email") {
      handleEmailChange(event);
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  };

  const checkRutAvailability = async (value) => {
    const formatted = formatRut(value);
    const cleanRut = normalizeRut(formatted);

    if (!cleanRut) {
      setRutStatus({ message: "RUT requerido", type: "error" });
      return false;
    }

    if (!validateRut(cleanRut)) {
      setRutStatus({ message: "Formato de RUT inválido", type: "error" });
      return false;
    }

    try {
      const excludeRut = normalizeRut(user?.rut) || normalizeRut(form.rut);
      const url = `/api/users/check-rut?rut=${encodeURIComponent(cleanRut)}&excludeRut=${encodeURIComponent(excludeRut)}`;
      const response = await apiFetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo verificar el RUT");
      }

      if (data.exists) {
        setRutStatus({ message: "El RUT ya está en uso", type: "error" });
        return false;
      }

      setRutStatus({ message: "RUT disponible", type: "success" });
      return true;
    } catch (error) {
      setRutStatus({ message: "Error al verificar el RUT", type: "error" });
      return false;
    }
  };

  const checkEmailAvailability = async (value) => {
    const emailValue = String(value || "").trim().toLowerCase();
    if (!emailValue) {
      setEmailStatus({ message: "Correo electrónico requerido", type: "error" });
      return false;
    }

    if (!validateEmail(emailValue)) {
      setEmailStatus({ message: "Correo electrónico inválido", type: "error" });
      return false;
    }

    try {
      const excludeRut = normalizeRut(user?.rut) || normalizeRut(form.rut);
      const url = `/api/users/check-email?email=${encodeURIComponent(emailValue)}&excludeRut=${encodeURIComponent(excludeRut)}`;
      const response = await apiFetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo verificar el correo");
      }

      if (data.exists) {
        setEmailStatus({ message: "El correo ya está en uso", type: "error" });
        return false;
      }

      setEmailStatus({ message: "Correo disponible", type: "success" });
      return true;
    } catch (error) {
      setEmailStatus({ message: "Error al verificar el correo", type: "error" });
      return false;
    }
  };

  const handleRutBlur = () => {
    if (user?.role === "admin") {
      checkRutAvailability(form.rut);
    }
  };

  const handleEmailBlur = () => {
    if (user?.role === "admin") {
      checkEmailAvailability(form.email);
    }
  };

  const handleModalChange = (event) => {
    const { name, value } = event.target;
    setModalForm((current) => ({ ...current, [name]: value }));
    setModalStatus({ message: "", type: "" });
  };

  const openPasswordModal = () => {
    setIsPasswordModalOpen(true);
    setPasswordStep(1);
    setModalForm(EMPTY_MODAL);
    setModalStatus({ message: "", type: "" });
    setShowPassword(false);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordStep(1);
    setModalForm(EMPTY_MODAL);
    setModalStatus({ message: "", type: "" });
    setShowPassword(false);
  };

  const handlePasswordNext = async () => {
    if (!modalForm.currentPassword) {
      setModalStatus({ message: "Ingresa la contraseña actual", type: "error" });
      return;
    }

    setModalStatus({ message: "", type: "" });
    setSubmitting(true);

    try {
      const response = await apiFetch("/api/users/me/verify-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: modalForm.currentPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Contraseña actual incorrecta");
      }

      setPasswordStep(2);
    } catch (error) {
      setModalStatus({ message: error.message || "Contraseña actual incorrecta", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!modalForm.newPassword || modalForm.newPassword.length < 8) {
      setModalStatus({ message: "La nueva contraseña debe tener al menos 8 caracteres", type: "error" });
      return;
    }
    if (modalForm.newPassword !== modalForm.confirmNewPassword) {
      setModalStatus({ message: "Las contraseñas no coinciden", type: "error" });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiFetch("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: modalForm.currentPassword,
          newPassword: modalForm.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar la contraseña");

      const updatedUser = {
        ...data,
        name: data.full_name || data.email,
        id: data.rut,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      login(updatedUser);
      showToast("Contraseña actualizada correctamente", "success");
      closePasswordModal();
    } catch (error) {
      setModalStatus({ message: error.message || "Error al cambiar la contraseña", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (user?.role !== "admin") {
        showToast("Solo los administradores pueden actualizar su información", "error");
        return;
      }

      const currentUserRut = normalizeRut(user?.rut || "");
      const currentUserEmail = String(user?.email || "").trim().toLowerCase();
      const currentUserName = String(user?.full_name || user?.name || "").trim();
      const payload = {};
      const newRut = normalizeRut(form.rut);
      const newEmail = String(form.email).trim().toLowerCase();

      if (newRut && newRut !== currentUserRut) payload.rut = newRut;
      if (form.full_name.trim() && form.full_name.trim() !== currentUserName) payload.full_name = form.full_name.trim();
      if (newEmail && newEmail !== currentUserEmail) payload.email = newEmail;

      if (Object.keys(payload).length === 0) {
        showToast("No hay cambios para guardar", "error");
        return;
      }

      if (payload.rut && !validateRut(payload.rut)) {
        setRutStatus({ message: "Formato de RUT inválido", type: "error" });
        return;
      }
      if (payload.email && !validateEmail(payload.email)) {
        setEmailStatus({ message: "Correo electrónico inválido", type: "error" });
        return;
      }

      const response = await apiFetch("/api/users/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar el perfil");

      const updatedUser = {
        ...data,
        name: data.full_name || data.email,
        id: data.rut,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      login(updatedUser);
      setForm({
        rut: formatRut(data.rut),
        full_name: data.full_name,
        email: data.email,
        role: data.role,
      });
      showToast("Perfil actualizado correctamente", "success");
    } catch (error) {
      showToast(error.message || "No se pudo actualizar el perfil", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const badge = ROLES[form.role] || { label: form.role || "Usuario", color: "#d0d5dd" };

  return (
    <div className="page-container" style={{ maxWidth: 760, margin: "0 auto", animation: "fadein 0.3s ease" }}>
      <div className="page-header" style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>Mi Perfil</h1>
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>Revisa o actualiza los datos de tu cuenta.</p>
          {/*
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, borderRadius: 999, background: primary, color: "#fff", fontSize: 12, fontWeight: 700, padding: "0 10px" }}>{form.role}</span>
            <span style={{ fontSize: 13, color: "var(--text2)" }}>Rol: {badge.label}</span>
          </div>
          */}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        {loading ? (
          <div style={{ color: "var(--text2)", fontSize: 13 }}>Cargando datos del perfil...</div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="responsive-grid" style={{ display: "flex", flexDirection: "column", gap: 12}}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
              RUT
              <input
                className="input-field"
                name="rut"
                value={form.rut}
                onChange={handleChange}
                onBlur={handleRutBlur}
                placeholder="11111111-1"
                required
                disabled={user?.role !== "admin"}
              />
              {rutStatus.message && <span style={statusStyle(rutStatus.type)}>{rutStatus.message}</span>}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
              Nombre completo
              <input
                className="input-field"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="Juan Pérez"
                required
                disabled={user?.role !== "admin"}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
              Correo electrónico
              <input
                className="input-field"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleEmailBlur}
                placeholder="usuario@flashorder.cl"
                required
                disabled={user?.role !== "admin"}
              />
              {emailStatus.message && <span style={statusStyle(emailStatus.type)}>{emailStatus.message}</span>}
            </label>
            {/*
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
              Rol
              <select className="input-field" name="role" value={form.role} disabled>
                <option value="empleado">Empleado</option>
                <option value="cocinero">Cocinero</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            */}
            {user?.role === "admin" && (
              <div style={{ gridColumn: "1 / span 2", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={submitting || loading}
                  style={{
                    background: primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 18px",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </form>

          <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Contraseña</h3>
              <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>Cambia tu contraseña de forma segura.</p>
            </div>
            <button
              type="button"
              onClick={openPasswordModal}
              style={{
                background: primary,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 18px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              Cambiar contraseña
            </button>
          </div>
          </>
        )}
      </div>

      {isPasswordModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.54)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
          onClick={closePasswordModal}
        >
          <div
            className="card"
            style={{
              width: "min(520px, 100%)",
              padding: 24,
              boxShadow: "0 28px 80px rgba(15, 23, 42, 0.32)",
              position: "relative",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", margin: 0 }}>Cambiar contraseña</h2>
                <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>Ingresa tu contraseña actual y luego define la nueva contraseña.</p>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                style={{
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  borderRadius: 999,
                  width: 30,
                  height: 30,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Cerrar modal"
              >
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
                Contraseña actual
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    className="input-field"
                    type={showPassword ? "text" : "password"}
                    name="currentPassword"
                    value={modalForm.currentPassword}
                    onChange={handleModalChange}
                    placeholder="Contraseña actual"
                    style={{ paddingRight: 40, width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 8,
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
                  </button>
                </div>
              </label>

              {passwordStep === 2 && (
                <>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
                    Nueva contraseña
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        className="input-field"
                        type={showPassword ? "text" : "password"}
                        name="newPassword"
                        value={modalForm.newPassword}
                        onChange={handleModalChange}
                        placeholder="Nueva contraseña"
                        style={{ paddingRight: 40, width: "100%" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: 8,
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: "none",
                          background: "transparent",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
                      </button>
                    </div>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
                    Confirmar nueva contraseña
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        className="input-field"
                        type={showPassword ? "text" : "password"}
                        name="confirmNewPassword"
                        value={modalForm.confirmNewPassword}
                        onChange={handleModalChange}
                        placeholder="Repite la nueva contraseña"
                        style={{ paddingRight: 40, width: "100%" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: 8,
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: "none",
                          background: "transparent",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
                      </button>
                    </div>
                  </label>
                </>
              )}

              {modalStatus.message && <span style={statusStyle(modalStatus.type)}>{modalStatus.message}</span>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                {passwordStep === 1 ? (
                  <button
                    type="button"
                    onClick={handlePasswordNext}
                    style={{
                      background: primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px 18px",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Siguiente
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={closePasswordModal}
                      style={{
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text)",
                        borderRadius: 10,
                        padding: "12px 18px",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handlePasswordSubmit}
                      disabled={submitting}
                      style={{
                        background: primary,
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "12px 18px",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      Guardar contraseña
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
