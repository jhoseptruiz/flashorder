import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";

const ROLES = {
  empleado: { label: "Empleado", color: "#f9c7d1" },
  cocinero: { label: "Cocinero", color: "#ffe3b3" },
};

const EMPTY_FORM = {
  rut: "",
  full_name: "",
  email: "",
  password: "",
  role: "empleado",
};

export default function Usuarios() {
  const { primary, showToast } = useTheme();
  const [usuarios, setUsuarios] = useState([]);
  const [editingRut, setEditingRut] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar los usuarios");
      }

      setUsuarios(data);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setEditingRut(null);
    setForm(EMPTY_FORM);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...form,
      };

      if (editingRut) {
        const response = await fetch(`${API_URL}/api/users/${editingRut}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({
            full_name: payload.full_name,
            email: payload.email,
            role: payload.role,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo actualizar el usuario");
        showToast("Usuario actualizado correctamente", "success");
      } else {
        if (!payload.password) {
          throw new Error("La contraseña es obligatoria para crear un usuario");
        }

        const response = await fetch(`${API_URL}/api/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo crear el usuario");
        showToast("Usuario creado correctamente", "success");
      }

      closeModal();
      await fetchUsers();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingRut(user.rut);
    setForm({
      rut: user.rut,
      full_name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (rut) => {
    if (!window.confirm("¿Seguro que quieres eliminar este usuario?")) return;

    try {
      const response = await fetch(`${API_URL}/api/users/${rut}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo eliminar el usuario");
      showToast("Usuario eliminado correctamente", "success");
      await fetchUsers();
      if (editingRut === rut) resetForm();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const empleados = usuarios.filter((user) => user.role === "empleado");
  const cocineros = usuarios.filter((user) => user.role === "cocinero");

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", animation: "fadein 0.3s ease" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>Gestión de Usuarios</h1>
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>Administra usuarios con acceso al sistema y sus roles</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, borderRadius: 999, background: primary, color: "#fff", fontSize: 12, fontWeight: 700, padding: "0 10px" }}>{usuarios.length}</span>
            <span style={{ fontSize: 13, color: "var(--text2)" }}>usuarios registrados</span>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          style={{
            background: primary,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 18px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 10px 24px rgba(124,58,237,0.22)",
          }}
        >
          <i className="ti ti-user-plus" />
          Agregar usuario
        </button>
      </div>

      {isModalOpen && (
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
          onClick={closeModal}
        >
          <div
            className="card"
            style={{
              width: "min(640px, 100%)",
              padding: 20,
              boxShadow: "0 28px 80px rgba(15, 23, 42, 0.32)",
              position: "relative",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", margin: 0 }}>{editingRut ? "Editar usuario" : "Agregar nuevo usuario"}</h2>
                <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 5 }}>Solo se permiten usuarios con rol empleado o cocinero</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
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

            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
            RUT
            <input
              className="input-field"
              name="rut"
              value={form.rut}
              onChange={handleChange}
              placeholder="11111111-1"
              disabled={Boolean(editingRut)}
              required
            />
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
              placeholder="usuario@flashorder.cl"
              required
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" }}>
            Rol
            <select
              className="input-field"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="empleado">Empleado</option>
              <option value="cocinero">Cocinero</option>
            </select>
          </label>

          {!editingRut && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)", gridColumn: "1 / span 2" }}>
              Contraseña inicial
              <input
                className="input-field"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Ingresá una contraseña"
                required={!editingRut}
              />
            </label>
          )}

          <div style={{ gridColumn: "1 / span 2", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: primary,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 16px",
                fontWeight: 600,
                fontSize: 13,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <i className={`ti ${editingRut ? "ti-device-floppy" : "ti-user-plus"}`} style={{ marginRight: 8 }} />
              {editingRut ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Empleados</h3>
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>{empleados.length} usuarios</p>
            </div>
          </div>

          {loading ? (
            <div style={{ color: "var(--text2)", fontSize: 13 }}>Cargando usuarios...</div>
          ) : empleados.length === 0 ? (
            <div style={{ color: "var(--text2)", fontSize: 13 }}>No hay empleados registrados.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {empleados.map((user) => (
                <UsuarioCard key={user.rut} user={user} onEdit={handleEdit} onDelete={handleDelete} highlight={editingRut === user.rut} />
              ))}
            </div>
          )}
        </section>

        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Cocineros</h3>
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>{cocineros.length} usuarios</p>
            </div>
          </div>

          {loading ? (
            <div style={{ color: "var(--text2)", fontSize: 13 }}>Cargando usuarios...</div>
          ) : cocineros.length === 0 ? (
            <div style={{ color: "var(--text2)", fontSize: 13 }}>No hay cocineros registrados.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cocineros.map((user) => (
                <UsuarioCard key={user.rut} user={user} onEdit={handleEdit} onDelete={handleDelete} highlight={editingRut === user.rut} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function UsuarioCard({ user, onEdit, onDelete, highlight }) {
  const badge = ROLES[user.role] || { label: user.role, color: "#d0d5dd" };

  return (
    <article
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        background: highlight ? "rgba(124, 58, 237, 0.08)" : "var(--surface)",
        borderRadius: 14,
        border: highlight ? "1px solid rgba(124, 58, 237, 0.35)" : "1px solid var(--border)",
        padding: "14px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: badge.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#111827",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {(user.full_name || user.email || "U")?.[0]?.toUpperCase() || "U"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.full_name}</div>
          <div style={{ color: "var(--text2)", fontSize: 12, marginTop: 2 }}>{user.email}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "2px 8px", background: badge.color, color: "#4b1f2f", fontSize: 10, fontWeight: 700 }}>{badge.label}</span>
            <span style={{ color: "var(--text2)", fontSize: 10 }}>RUT: {user.rut}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onEdit(user)}
          style={{ border: "1px solid var(--border)", background: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer", color: "var(--text)" }}
        >
          <i className="ti ti-edit" style={{ marginRight: 4 }} />Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(user.rut)}
          style={{ border: "1px solid #f9c7d1", background: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer", color: "#d7263d" }}
        >
          <i className="ti ti-trash" style={{ marginRight: 4 }} />Eliminar
        </button>
      </div>
    </article>
  );
}
