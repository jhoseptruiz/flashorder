import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/apiFetch";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const BEHAVIOR_MAP = {
  independiente: { label: "Independiente", sigla: "I", color: "#6366f1", bg: "#eef2ff" },
  base:          { label: "Base",          sigla: "B", color: "#d97706", bg: "#fffbeb" },
  complemento:   { label: "Complemento",   sigla: "C", color: "#0891b2", bg: "#ecfeff" },
};

// ════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════

export default function Catalogo() {
  const { primary, primaryLight, showToast } = useTheme();

  // Data
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cupones, setCupones] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI
  const [activeTab, setActiveTab] = useState("productos");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBehavior, setFilterBehavior] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Categories filtered by selected behavior (for the category dropdown)
  const behaviorFilteredCategories = useMemo(() => {
    if (!filterBehavior) return categorias;
    return categorias.filter((c) => c.behavior === filterBehavior);
  }, [categorias, filterBehavior]);

  // Modals
  const [catModal, setCatModal] = useState({ open: false, data: null });
  const [prodModal, setProdModal] = useState({ open: false, data: null });
  const [couponModal, setCouponModal] = useState({ open: false, data: null });
  const [promoModal, setPromoModal] = useState({ open: false, data: null });

  // ─── Fetch ────────────────────────────────────────
  const fetchData = async () => {
    try {
      const [catRes, prodRes, coupRes, promoRes] = await Promise.all([
        apiFetch(`/api/catalog/categories`),
        apiFetch(`/api/catalog/products`),
        apiFetch(`/api/catalog/coupons`),
        apiFetch(`/api/catalog/promotions`),
      ]);
      const catData = catRes.ok ? await catRes.json() : [];
      const prodData = prodRes.ok ? await prodRes.json() : [];
      const coupData = coupRes.ok ? await coupRes.json() : [];
      const promoData = promoRes.ok ? await promoRes.json() : [];
      setCategorias(Array.isArray(catData) ? catData : []);
      setProductos(Array.isArray(prodData) ? prodData : []);
      setCupones(Array.isArray(coupData) ? coupData : []);
      setPromociones(Array.isArray(promoData) ? promoData : []);
    } catch (err) {
      console.error("Error al cargar catálogo:", err);
      setCategorias([]);
      setProductos([]);
      setCupones([]);
      setPromociones([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Filtered products (memo) ─────────────────────
  const filteredProducts = useMemo(() => {
    let list = productos;
    if (filterBehavior) {
      const catIdsOfBehavior = categorias.filter((c) => c.behavior === filterBehavior).map((c) => c.id);
      list = list.filter((p) => catIdsOfBehavior.includes(p.categoryId));
    }
    if (filterCategory) {
      list = list.filter((p) => p.categoryId === filterCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(term));
    }
    return list;
  }, [productos, categorias, filterBehavior, filterCategory, searchTerm]);

  // ─── Category CRUD ────────────────────────────────
  const openCatCreate = () =>
    setCatModal({ open: true, data: { name: "", behavior: "independiente", displayOrder: 0, minItems: 0, maxItems: "" } });

  const openCatEdit = (cat) =>
    setCatModal({ open: true, data: { ...cat } });

  const saveCat = async (formData) => {
    const isEdit = !!formData.id;
    try {
      const url = isEdit
        ? `${API_URL}/api/catalog/categories/${formData.id}`
        : `${API_URL}/api/catalog/categories`;
      const res = await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar categoría");
      showToast(isEdit ? "Categoría actualizada" : "Categoría creada", "success");
      setCatModal({ open: false, data: null });
      fetchData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deleteCat = async (cat) => {
    const result = await Swal.fire({
      title: "¿Eliminar categoría?",
      html: `Se eliminará <strong>${cat.name}</strong> permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, eliminar",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await apiFetch(`/api/catalog/categories/${cat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      showToast("Categoría eliminada", "success");
      fetchData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ─── Product CRUD ─────────────────────────────────
  const openProdCreate = () =>
    setProdModal({
      open: true,
      data: {
        name: "",
        categoryId: "",
        isComposite: false,
        baseCategoryId: "",
        relatedCategoryId: "",
        variants: [{ variantName: "Única", price: "" }],
      },
    });

  const openProdEdit = (prod) =>
    setProdModal({
      open: true,
      data: {
        id: prod.id,
        name: prod.name,
        categoryId: prod.categoryId,
        isComposite: prod.isComposite,
        baseCategoryId: prod.baseCategoryId || "",
        relatedCategoryId: prod.relatedCategoryId || "",
        variants: prod.variants?.map((v) => ({
          id: v.id,
          variantName: v.variantName,
          price: v.price,
        })) || [{ variantName: "Única", price: "" }],
      },
    });

  const saveProd = async (formData) => {
    const isEdit = !!formData.id;
    try {
      const url = isEdit
        ? `${API_URL}/api/catalog/products/${formData.id}`
        : `${API_URL}/api/catalog/products`;
      const res = await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar producto");
      showToast(isEdit ? "Producto actualizado" : "Producto creado", "success");
      setProdModal({ open: false, data: null });
      fetchData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deleteProd = async (prod) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      html: `Se eliminará <strong>${prod.name}</strong> y todas sus variantes.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, eliminar",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await apiFetch(`/api/catalog/products/${prod.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      showToast("Producto eliminado", "success");
      fetchData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ─── Toggle product active ─────────────────────────────
  const toggleProductActive = async (prod) => {
    try {
      const url = `${API_URL}/api/catalog/products/${prod.id}`;
      const res = await apiFetch(url, {
        method: "PUT",
        body: JSON.stringify({ isActive: !prod.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar estado");
      showToast(prod.isActive ? "Producto desactivado" : "Producto activado", "success");
      fetchData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ─── Coupon CRUD ──────────────────────────────────
  const openCouponCreate = () =>
    setCouponModal({ open: true, data: { code: "", discountType: "percentage", discountValue: "", maxUses: "", expirationDate: "", isAccumulable: false } });

  const openCouponEdit = (c) =>
    setCouponModal({ open: true, data: { ...c, expirationDate: c.expirationDate ? c.expirationDate.substring(0, 10) : "" } });

  const saveCoupon = async (formData) => {
    const isEdit = !!formData.id;
    try {
      const url = isEdit ? `${API_URL}/api/catalog/coupons/${formData.id}` : `${API_URL}/api/catalog/coupons`;
      const res = await apiFetch(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(formData) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar cupón");
      showToast(isEdit ? "Cupón actualizado" : "Cupón creado", "success");
      setCouponModal({ open: false, data: null });
      fetchData();
    } catch (err) { showToast(err.message, "error"); }
  };

  const deleteCoupon = async (c) => {
    const result = await Swal.fire({ title: "¿Eliminar cupón?", html: `Se eliminará <strong>${c.code}</strong> permanentemente.`, icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar", confirmButtonText: "Sí, eliminar" });
    if (!result.isConfirmed) return;
    try {
      const res = await apiFetch(`/api/catalog/coupons/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      showToast("Cupón eliminado", "success");
      fetchData();
    } catch (err) { showToast(err.message, "error"); }
  };

  // ─── Promotion CRUD ───────────────────────────────
  const openPromoCreate = () =>
    setPromoModal({ open: true, data: { name: "", promotionType: "bogo", conditionProductId: "", conditionMinQuantity: "", conditionMinAmount: "", rewardProductId: "", rewardDiscountType: "free", rewardValue: "" } });

  const openPromoEdit = (p) =>
    setPromoModal({ open: true, data: { ...p, conditionProductId: p.conditionProductId || "", rewardProductId: p.rewardProductId || "" } });

  const savePromo = async (formData) => {
    const isEdit = !!formData.id;
    try {
      const url = isEdit ? `${API_URL}/api/catalog/promotions/${formData.id}` : `${API_URL}/api/catalog/promotions`;
      const res = await apiFetch(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(formData) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar promoción");
      showToast(isEdit ? "Promoción actualizada" : "Promoción creada", "success");
      setPromoModal({ open: false, data: null });
      fetchData();
    } catch (err) { showToast(err.message, "error"); }
  };

  const deletePromo = async (p) => {
    const result = await Swal.fire({ title: "¿Eliminar promoción?", html: `Se eliminará <strong>${p.name}</strong> permanentemente.`, icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonText: "Cancelar", confirmButtonText: "Sí, eliminar" });
    if (!result.isConfirmed) return;
    try {
      const res = await apiFetch(`/api/catalog/promotions/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      showToast("Promoción eliminada", "success");
      fetchData();
    } catch (err) { showToast(err.message, "error"); }
  };

  // ─── Stats ────────────────────────────────────────
  const stats = useMemo(() => ({
    total: productos.length,
    active: productos.filter((p) => p.isActive).length,
    categories: categorias.length,
    coupons: cupones.length,
    promotions: promociones.length,
  }), [productos, categorias, cupones, promociones]);

  // ─── Loading ──────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", gap: 12, color: "var(--text2)" }}>
        <i className="ti ti-loader" style={{ fontSize: 24, animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 15 }}>Cargando catálogo…</span>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", animation: "fadein 0.3s ease" }}>

      {/* ─── Header ─────────────────────────────────── */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>
            Catálogo de Menú
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
            Gestiona las categorías y productos de tu negocio
          </p>
          <div className="stats-container" style={{ display: "flex", gap: 16, marginTop: 14 }}>
            <StatBadge icon="ti-package" label="Productos" value={stats.total} color={primary} />
            <StatBadge icon="ti-circle-check" label="Activos" value={stats.active} color="#16a34a" />
            <StatBadge icon="ti-category" label="Categorías" value={stats.categories} color="#6366f1" />
            <StatBadge icon="ti-ticket" label="Cupones" value={stats.coupons} color="#d97706" />
            <StatBadge icon="ti-gift" label="Promociones" value={stats.promotions} color="#dc2626" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={openCatCreate} style={{ ...btnOutline, borderColor: "var(--border)", color: "var(--text)" }}>
            <i className="ti ti-folder-plus" style={{ fontSize: 17 }} /> Nueva Categoría
          </button>
          <button onClick={openProdCreate} style={{ ...btnSolid, background: primary }}>
            <i className="ti ti-plus" style={{ fontSize: 17 }} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────── */}
      <div className="tabs-container" style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 24 }}>
        {["productos", "categorias", "cupones", "promociones"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "11px 22px",
              fontSize: 14,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? primary : "var(--text2)",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? `3px solid ${primary}` : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.18s",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: -2,
            }}
          >
            {tab === "productos" ? `Productos (${productos.length})`
              : tab === "categorias" ? `Categorías (${categorias.length})`
              : tab === "cupones" ? `Cupones (${cupones.length})`
              : `Promociones (${promociones.length})`}
          </button>
        ))}
      </div>

      {/* ─── Tab: Productos ──────────────────────────── */}
      {activeTab === "productos" && (
        <>
          {/* Search + Filter bar */}
          <div className="filters-container" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 240px" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 17, color: "var(--text2)" }} />
              <input
                className="input-field"
                placeholder="Buscar productos por nombre…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 40 }}
              />
            </div>
            <select
              className="input-field"
              value={filterBehavior}
              onChange={(e) => { setFilterBehavior(e.target.value); setFilterCategory(""); }}
              style={{ flex: "0 1 190px" }}
            >
              <option value="">Todos los tipos</option>
              <option value="independiente">I — Independiente</option>
              <option value="base">B — Base</option>
              <option value="complemento">C — Complemento</option>
            </select>
            <select
              className="input-field"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ flex: "0 1 220px" }}
            >
              <option value="">Todas las categorías</option>
              {behaviorFilteredCategories.map((c) => {
                const beh = BEHAVIOR_MAP[c.behavior] || BEHAVIOR_MAP.independiente;
                return <option key={c.id} value={c.id}>[{beh.sigla}] {c.name}</option>;
              })}
            </select>
          </div>

          {/* Products grid */}
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon="ti-package-off"
              title={searchTerm || filterCategory || filterBehavior ? "Sin resultados" : "No hay productos"}
              subtitle={searchTerm || filterCategory || filterBehavior ? "Intenta con otro filtro o búsqueda" : "Crea tu primer producto para comenzar"}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  categorias={categorias}
                  primary={primary}
                  onEdit={() => openProdEdit(prod)}
                  onDelete={() => deleteProd(prod)}
                  onToggleActive={() => toggleProductActive(prod)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Tab: Categorías ─────────────────────────── */}
      {activeTab === "categorias" && (
        <>
          {categorias.length === 0 ? (
            <EmptyState
              icon="ti-folder-off"
              title="No hay categorías"
              subtitle="Crea tu primera categoría para organizar los productos"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {categorias.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  primary={primary}
                  onEdit={() => openCatEdit(cat)}
                  onDelete={() => deleteCat(cat)}
                />
              ))}
            </div>
          )}
        </>
      )}
      {/* ─── Tab: Cupones ────────────────────────────── */}
      {activeTab === "cupones" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={openCouponCreate} style={{ ...btnSolid, background: primary }}>
              <i className="ti ti-plus" style={{ fontSize: 17 }} /> Nuevo Cupón
            </button>
          </div>
          {cupones.length === 0 ? (
            <EmptyState icon="ti-ticket-off" title="No hay cupones" subtitle="Crea tu primer cupón de descuento" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cupones.map((c) => (
                <CouponRow key={c.id} coupon={c} primary={primary} onEdit={() => openCouponEdit(c)} onDelete={() => deleteCoupon(c)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Tab: Promociones ─────────────────────────── */}
      {activeTab === "promociones" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={openPromoCreate} style={{ ...btnSolid, background: primary }}>
              <i className="ti ti-plus" style={{ fontSize: 17 }} /> Nueva Promoción
            </button>
          </div>
          {promociones.length === 0 ? (
            <EmptyState icon="ti-gift-off" title="No hay promociones" subtitle="Crea tu primera promoción condicional" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {promociones.map((p) => (
                <PromotionRow key={p.id} promotion={p} primary={primary} onEdit={() => openPromoEdit(p)} onDelete={() => deletePromo(p)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Modal: Categoría ────────────────────────── */}
      {catModal.open && (
        <CategoryModal
          data={catModal.data}
          primary={primary}
          onClose={() => setCatModal({ open: false, data: null })}
          onSave={saveCat}
        />
      )}

      {/* ─── Modal: Producto ─────────────────────────── */}
      {prodModal.open && (
        <ProductModal
          data={prodModal.data}
          categorias={categorias}
          primary={primary}
          primaryLight={primaryLight}
          onClose={() => setProdModal({ open: false, data: null })}
          onSave={saveProd}
        />
      )}

      {/* ─── Modal: Cupón ────────────────────────────── */}
      {couponModal.open && (
        <CouponModal
          data={couponModal.data}
          primary={primary}
          onClose={() => setCouponModal({ open: false, data: null })}
          onSave={saveCoupon}
        />
      )}

      {/* ─── Modal: Promoción ────────────────────────── */}
      {promoModal.open && (
        <PromotionModal
          data={promoModal.data}
          productos={productos}
          primary={primary}
          onClose={() => setPromoModal({ open: false, data: null })}
          onSave={savePromo}
        />
      )}

      <style>{`
        @media (max-width: 767px) {
          .page-container {
            padding: 0 16px !important;
          }
          /* Stats */
          .stats-container {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 12px !important;
            margin-top: 16px;
          }
          /* Tabs */
          .tabs-container {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
          }
          .tabs-container > button {
            white-space: nowrap;
            font-size: 14px !important;
            padding: 11px 16px !important;
          }
          /* Filters */
          .filters-container {
            flex-direction: column !important;
          }
          .filters-container > * {
            flex: unset !important;
            width: 100% !important;
          }
          /* Grid of products / categories */
          div[style*="grid-template-columns: repeat(auto-fill"] {
            grid-template-columns: 1fr !important;
          }
          /* Modals */
          .card[style*="width: min(520px"] {
            width: 95% !important;
            padding: 16px !important;
            max-height: 90vh;
            overflow-y: auto;
          }
          /* Modal internal grids */
          form > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}


// ════════════════════════════════════════════════════════
//  SUBCOMPONENTES
// ════════════════════════════════════════════════════════

function StatBadge({ icon, label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--text2)" }}>{label}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 12, opacity: 0.5 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 48, color: "var(--text2)" }} />
      <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "var(--text2)" }}>{subtitle}</p>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────
function ProductCard({ product, categorias, primary, onEdit, onDelete, onToggleActive }) {
  const cat = categorias.find((c) => c.id === product.categoryId);
  const catName = cat?.name || "Sin categoría";
  const beh = cat ? BEHAVIOR_MAP[cat.behavior] || BEHAVIOR_MAP.independiente : BEHAVIOR_MAP.independiente;
  const variants = product.variants || [];
  const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0;
  const maxPrice = variants.length > 0 ? Math.max(...variants.map((v) => v.price)) : 0;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow 0.2s", opacity: product.isActive ? 1 : 0.65 }}>
      {/* Card header */}
      <div style={{ padding: "18px 20px 14px", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: primary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {catName}
            </span>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "4px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {product.name}
            </h3>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
            {/* Behavior sigla badge */}
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 800,
              background: beh.bg, color: beh.color, border: `1.5px solid ${beh.color}30`,
              letterSpacing: 0, lineHeight: 1,
            }} title={beh.label}>
              {beh.sigla}
            </span>
            {product.isComposite && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e" }}>
                <i className="ti ti-puzzle" style={{ fontSize: 12 }} /> Compuesto
              </span>
            )}
          </div>
        </div>

        {/* Variants list */}
        {variants.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            {variants.slice(0, 3).map((v) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--text2)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="ti ti-tag" style={{ fontSize: 13, opacity: 0.5 }} />
                  {v.variantName}
                </span>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>
                  ${v.price.toLocaleString("es-CL")}
                </span>
              </div>
            ))}
            {variants.length > 3 && (
              <span style={{ fontSize: 11, color: "var(--text2)", fontStyle: "italic" }}>
                +{variants.length - 3} variante(s) más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text)" }}>
          {minPrice === maxPrice
            ? `$${minPrice.toLocaleString("es-CL")}`
            : `$${minPrice.toLocaleString("es-CL")} – $${maxPrice.toLocaleString("es-CL")}`}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Toggle active */}
          <button
            onClick={onToggleActive}
            title={product.isActive ? "Desactivar producto" : "Activar producto"}
            style={{
              ...btnSmall,
              padding: "5px 10px",
              color: product.isActive ? "#15803d" : "#dc2626",
              borderColor: product.isActive ? "#86efac" : "#fca5a5",
              background: product.isActive ? "#f0fdf4" : "#fef2f2",
              transition: "all 0.2s",
            }}
          >
            <i className={`ti ${product.isActive ? "ti-eye" : "ti-eye-off"}`} style={{ fontSize: 15 }} />
            {product.isActive ? "Activo" : "Inactivo"}
          </button>
          <button onClick={onEdit} style={btnSmall}>
            <i className="ti ti-edit" style={{ fontSize: 15 }} /> Editar
          </button>
          <button onClick={onDelete} style={{ ...btnSmall, color: "#dc2626", borderColor: "#fca5a5" }}>
            <i className="ti ti-trash" style={{ fontSize: 15 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Category Row ──────────────────────────────────────
function CategoryRow({ category, primary, onEdit, onDelete }) {
  const beh = BEHAVIOR_MAP[category.behavior] || BEHAVIOR_MAP.independiente;

  return (
    <article className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: beh.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="ti ti-category" style={{ fontSize: 19, color: beh.color }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {category.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: beh.bg, color: beh.color }}>
              {beh.label}
            </span>
            <span style={{ fontSize: 12, color: "var(--text2)" }}>
              {category.productCount ?? 0} producto(s)
            </span>
            <span style={{ fontSize: 12, color: "var(--text2)" }}>
              Orden: {category.displayOrder}
            </span>
            {(category.behavior === "base" || category.behavior === "complemento") && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: "#f0fdf4", color: "#166534" }}>
                Mín: {category.minItems ?? 0} / Máx: {category.maxItems ?? "∞"}
              </span>
            )}
            {category.discountActive && category.discountType !== 'none' && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: "#fef3c7", color: "#92400e", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <i className="ti ti-discount-2" style={{ fontSize: 12 }} />
                {category.discountType === 'percentage' ? `${category.discountValue}%` : `$${category.discountValue?.toLocaleString("es-CL")}`} dcto
                {!category.isAccumulable && " (único)"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={btnSmall}>
          <i className="ti ti-edit" style={{ fontSize: 15 }} /> Editar
        </button>
        <button onClick={onDelete} style={{ ...btnSmall, color: "#dc2626", borderColor: "#fca5a5" }}>
          <i className="ti ti-trash" style={{ fontSize: 15 }} />
        </button>
      </div>
    </article>
  );
}


// ════════════════════════════════════════════════════════
//  MODAL: CATEGORÍA
// ════════════════════════════════════════════════════════

function CategoryModal({ data, primary, onClose, onSave }) {
  const [form, setForm] = useState({ ...data, minItems: data.minItems ?? 0, maxItems: data.maxItems ?? "", discountType: data.discountType || 'none', discountValue: data.discountValue || "", discountActive: data.discountActive || false, isAccumulable: data.isAccumulable || false, discountExpirationDate: data.discountExpirationDate ? data.discountExpirationDate.split('T')[0] : "", discountActiveDays: data.discountActiveDays || [] });
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!form.id;

  const isBaseOrComplemento = form.behavior === "base" || form.behavior === "complemento";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!isBaseOrComplemento) {
      payload.minItems = 0;
      payload.maxItems = null;
    } else {
      payload.minItems = parseInt(payload.minItems) || 0;
      payload.maxItems = payload.maxItems === "" || payload.maxItems === null ? null : parseInt(payload.maxItems);
    }
    setSubmitting(true);
    await onSave(payload);
    setSubmitting(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ width: "min(520px, 100%)", padding: 24, position: "relative", boxShadow: "0 28px 80px rgba(15,23,42,0.32)" }} onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={isEdit ? "Editar categoría" : "Nueva categoría"} subtitle="Define el nombre y comportamiento de la categoría" onClose={onClose} />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Nombre de la categoría">
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Pizzas, Bebidas, Ingredientes…"
              required
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Comportamiento">
              <select
                className="input-field"
                value={form.behavior}
                onChange={(e) => setForm({ ...form, behavior: e.target.value })}
              >
                <option value="independiente">Independiente — venta directa</option>
                <option value="base">Base — madre en armado</option>
                <option value="complemento">Complemento — ingrediente</option>
              </select>
            </Field>

            <Field label="Orden de visualización">
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </Field>
          </div>

          {/* Campos de mínimos y máximos (solo para base/complemento) */}
          {isBaseOrComplemento && (
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 18px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
                <i className="ti ti-adjustments-horizontal" style={{ fontSize: 18, color: "var(--text2)" }} />
                Límites de selección
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Mínimo de ítems">
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={form.minItems}
                    onChange={(e) => setForm({ ...form, minItems: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </Field>
                <Field label="Máximo de ítems">
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={form.maxItems}
                    onChange={(e) => setForm({ ...form, maxItems: e.target.value })}
                    placeholder="Sin límite"
                  />
                </Field>
              </div>
              <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 8 }}>
                Define cuántos ítems de esta categoría se pueden seleccionar al armar un producto compuesto. Deja el máximo vacío para no limitar.
              </p>
            </div>
          )}

          {/* Hint */}
          <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
            <strong style={{ color: "var(--text)" }}>Comportamientos:</strong><br />
            • <strong>Independiente:</strong> productos que se venden directamente (ej: Bebidas, Postres)<br />
            • <strong>Base:</strong> categoría madre para armar compuestos (ej: Tipos de Pizza)<br />
            • <strong>Complemento:</strong> ingredientes opcionales (ej: Toppings, Salsas)
          </div>
          {/* Descuento */}
          <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 18px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
              <i className="ti ti-discount-2" style={{ fontSize: 18, color: "#d97706" }} />
              Descuento de categoría
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Tipo de descuento">
                <select className="input-field" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                  <option value="none">Sin descuento</option>
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </Field>
              {form.discountType !== 'none' && (
                <Field label={form.discountType === 'percentage' ? "Porcentaje" : "Monto"}>
                  <input className="input-field" type="number" min="0" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder={form.discountType === 'percentage' ? "Ej: 10" : "Ej: 1500"} />
                </Field>
              )}
            </div>
            {form.discountType !== 'none' && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Fecha de expiración (opcional)">
                    <input className="input-field" type="date" value={form.discountExpirationDate} onChange={(e) => setForm({ ...form, discountExpirationDate: e.target.value })} />
                  </Field>
                  <Field label="Días activos (opcional)">
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const current = form.discountActiveDays || [];
                            const updated = current.includes(i) ? current.filter(d => d !== i) : [...current, i];
                            setForm({ ...form, discountActiveDays: updated });
                          }}
                          style={{
                            padding: "4px 8px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", border: "1px solid",
                            background: form.discountActiveDays?.includes(i) ? primary : "transparent",
                            color: form.discountActiveDays?.includes(i) ? "#fff" : "var(--text2)",
                            borderColor: form.discountActiveDays?.includes(i) ? primary : "var(--border)",
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text)", marginTop: 8 }}>
                  <input type="checkbox" checked={form.discountActive} onChange={(e) => setForm({ ...form, discountActive: e.target.checked })} style={{ width: 18, height: 18, accentColor: primary }} />
                  <i className="ti ti-toggle-right" style={{ fontSize: 16, color: "var(--text2)" }} />
                  Descuento activo
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text)" }}>
                  <input type="checkbox" checked={!form.isAccumulable} onChange={(e) => setForm({ ...form, isAccumulable: !e.target.checked })} style={{ width: 18, height: 18, accentColor: primary }} />
                  <i className="ti ti-shield-lock" style={{ fontSize: 16, color: "var(--text2)" }} />
                  Descuento único (no se acumula con otros)
                </label>
                <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>
                  Si está marcado como "único", cuando haya múltiples descuentos solo se aplicará el de mayor beneficio.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
            <button type="submit" disabled={submitting} style={{ ...btnSolid, background: primary, opacity: submitting ? 0.7 : 1 }}>
              <i className={`ti ${isEdit ? "ti-device-floppy" : "ti-folder-plus"}`} style={{ fontSize: 16 }} />
              {isEdit ? "Guardar cambios" : "Crear categoría"}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}


// ════════════════════════════════════════════════════════
//  MODAL: PRODUCTO
// ════════════════════════════════════════════════════════

function ProductModal({ data, categorias, primary, primaryLight, onClose, onSave }) {
  const [form, setForm] = useState({ ...data });
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!form.id;

  // Categorías filtradas para la base (solo las de tipo "base")
  const baseCategories = categorias.filter((c) => c.behavior === "base");

  // Categorías independientes (para asociar productos base/complemento)
  const independentCategories = categorias.filter((c) => c.behavior === "independiente");

  // Determinar si la categoría seleccionada es base o complemento
  const selectedCat = categorias.find((c) => c.id === form.categoryId);
  const isBaseOrComplementoCat = selectedCat?.behavior === "base" || selectedCat?.behavior === "complemento";

  const addVariant = () => {
    setForm({ ...form, variants: [...form.variants, { variantName: "", price: "" }] });
  };

  const removeVariant = (index) => {
    if (form.variants.length <= 1) return;
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) });
  };

  const updateVariant = (index, field, value) => {
    const updated = form.variants.map((v, i) => (i === index ? { ...v, [field]: value } : v));
    setForm({ ...form, variants: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validar variantes
    const invalidVariants = form.variants.some((v) => !v.variantName.trim() || !v.price || parseInt(v.price) < 0);
    if (invalidVariants) {
      Swal.fire({ icon: "error", title: "Variantes inválidas", text: "Cada variante debe tener nombre y un precio válido (≥ 0)." });
      return;
    }
    setSubmitting(true);
    await onSave(form);
    setSubmitting(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ width: "min(660px, 100%)", padding: 24, position: "relative", boxShadow: "0 28px 80px rgba(15,23,42,0.32)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={isEdit ? "Editar producto" : "Nuevo producto"} subtitle="Define la información del producto y sus variantes de precio" onClose={onClose} />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Nombre + Categoría */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Nombre del producto">
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Pizza Margarita, Coca-Cola…"
                required
              />
            </Field>
            <Field label="Categoría">
              <select
                className="input-field"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value, relatedCategoryId: "" })}
                required
              >
                <option value="" disabled>Seleccionar categoría…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.behavior})</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Categoría independiente relacionada (solo para base/complemento) */}
          {isBaseOrComplementoCat && (
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 18px" }}>
              <Field label="Relacionar con categoría independiente">
                <select
                  className="input-field"
                  value={form.relatedCategoryId}
                  onChange={(e) => setForm({ ...form, relatedCategoryId: e.target.value })}
                >
                  <option value="">Sin relación específica</option>
                  {independentCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 6 }}>
                <i className="ti ti-info-circle" style={{ fontSize: 13 }} /> Define a qué producto independiente pertenece este ingrediente/base (ej: ingredientes de Pizza vs Hamburguesa).
              </p>
            </div>
          )}

          {/* isActive toggle (only on edit) */}
          {isEdit && (
            <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 18px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                <input
                  type="checkbox"
                  checked={form.isActive !== undefined ? form.isActive : true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: primary }}
                />
                <i className={`ti ${form.isActive !== false ? "ti-eye" : "ti-eye-off"}`} style={{ fontSize: 18, color: form.isActive !== false ? "#15803d" : "#dc2626" }} />
                {form.isActive !== false ? "Producto activo (visible en el menú)" : "Producto inactivo (oculto del menú)"}
              </label>
            </div>
          )}

          {/* Composite toggle */}
          <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 18px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
              <input
                type="checkbox"
                checked={form.isComposite}
                onChange={(e) => setForm({ ...form, isComposite: e.target.checked, baseCategoryId: "" })}
                style={{ width: 18, height: 18, accentColor: primary }}
              />
              <i className="ti ti-puzzle" style={{ fontSize: 18, color: "var(--text2)" }} />
              Producto compuesto (se arma con el asistente de composición)
            </label>

            {form.isComposite && (
              <div style={{ marginTop: 14 }}>
                <Field label="Categoría base del asistente">
                  <select
                    className="input-field"
                    value={form.baseCategoryId}
                    onChange={(e) => setForm({ ...form, baseCategoryId: e.target.value })}
                    required={form.isComposite}
                  >
                    <option value="" disabled>Seleccionar categoría base…</option>
                    {baseCategories.length === 0 ? (
                      <option value="" disabled>No hay categorías con comportamiento "Base"</option>
                    ) : (
                      baseCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    )}
                  </select>
                </Field>
                {baseCategories.length === 0 && (
                  <p style={{ fontSize: 12, color: "#d97706", marginTop: 6 }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} /> Primero crea una categoría con comportamiento "Base".
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── Variants section ─────────────────────── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                <i className="ti ti-tags" style={{ fontSize: 15, marginRight: 6, color: "var(--text2)" }} />
                Variantes de precio ({form.variants.length})
              </label>
              <button type="button" onClick={addVariant} style={{ ...btnSmall, color: primary, borderColor: primary + "44", background: primaryLight + "44" }}>
                <i className="ti ti-plus" style={{ fontSize: 14 }} /> Agregar variante
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {form.variants.map((v, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    className="input-field"
                    value={v.variantName}
                    onChange={(e) => updateVariant(i, "variantName", e.target.value)}
                    placeholder="Nombre (ej: Familiar, Personal)"
                    required
                    style={{ flex: "1 1 55%" }}
                  />
                  <div style={{ position: "relative", flex: "1 1 35%" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text2)", fontWeight: 600 }}>$</span>
                    <input
                      className="input-field"
                      type="number"
                      min="0"
                      value={v.price}
                      onChange={(e) => updateVariant(i, "price", e.target.value)}
                      placeholder="Precio"
                      required
                      style={{ paddingLeft: 28 }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariant(i)}
                    disabled={form.variants.length <= 1}
                    style={{
                      ...btnSmall,
                      padding: "8px 10px",
                      color: form.variants.length <= 1 ? "var(--border)" : "#dc2626",
                      borderColor: form.variants.length <= 1 ? "var(--border)" : "#fca5a5",
                      cursor: form.variants.length <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    <i className="ti ti-x" style={{ fontSize: 15 }} />
                  </button>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 8 }}>
              Si el producto tiene un solo precio, deja una variante llamada "Única".
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
            <button type="submit" disabled={submitting} style={{ ...btnSolid, background: primary, opacity: submitting ? 0.7 : 1 }}>
              <i className={`ti ${isEdit ? "ti-device-floppy" : "ti-plus"}`} style={{ fontSize: 16 }} />
              {isEdit ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}


// ════════════════════════════════════════════════════════
//  UTILITIES / SHARED
// ════════════════════════════════════════════════════════

function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(15,23,42,0.54)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 20,
        animation: "fadein 0.2s ease",
      }}
    >
      {children}
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 999, width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>
        <i className="ti ti-x" />
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text2)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Shared inline styles ──────────────────────────────
const btnSolid = {
  background: "#7c3aed",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontFamily: "DM Sans, sans-serif",
  transition: "opacity 0.18s",
};

const btnOutline = {
  background: "transparent",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 18px",
  fontWeight: 500,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontFamily: "DM Sans, sans-serif",
};

const btnSmall = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  color: "var(--text)",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontFamily: "DM Sans, sans-serif",
};

// ════════════════════════════════════════════════════════
//  SUBCOMPONENTES: CUPONES
// ════════════════════════════════════════════════════════

function CouponRow({ coupon, primary, onEdit, onDelete }) {
  const isExpired = coupon.expirationDate && new Date(coupon.expirationDate) < new Date();
  const usesText = coupon.maxUses ? `${coupon.currentUses}/${coupon.maxUses} usos` : `${coupon.currentUses} usos`;

  return (
    <article className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="ti ti-ticket" style={{ fontSize: 19, color: "#d97706" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", letterSpacing: "0.5px" }}>
            {coupon.code}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: "#fef3c7", color: "#92400e" }}>
              {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue?.toLocaleString("es-CL")}`}
            </span>
            <span style={{ fontSize: 12, color: "var(--text2)" }}>{usesText}</span>
            {coupon.expirationDate && (
              <span style={{ fontSize: 11, color: isExpired ? "#dc2626" : "var(--text2)" }}>
                {isExpired ? "Expirado" : `Expira: ${new Date(coupon.expirationDate).toLocaleDateString("es-CL")}`}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: coupon.isActive && !isExpired ? "#dcfce7" : "#fee2e2", color: coupon.isActive && !isExpired ? "#15803d" : "#dc2626" }}>
              {coupon.isActive && !isExpired ? "Activo" : "Inactivo"}
            </span>
            {!coupon.isAccumulable && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#e0e7ff", color: "#4338ca" }}>Único</span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={btnSmall}><i className="ti ti-edit" style={{ fontSize: 15 }} /> Editar</button>
        <button onClick={onDelete} style={{ ...btnSmall, color: "#dc2626", borderColor: "#fca5a5" }}><i className="ti ti-trash" style={{ fontSize: 15 }} /></button>
      </div>
    </article>
  );
}

function CouponModal({ data, primary, onClose, onSave }) {
  const [form, setForm] = useState({ ...data });
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!form.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSave(form);
    setSubmitting(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ width: "min(520px, 100%)", padding: 24, position: "relative", boxShadow: "0 28px 80px rgba(15,23,42,0.32)" }} onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={isEdit ? "Editar cupón" : "Nuevo cupón"} subtitle="Configura un código de descuento" onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Código del cupón">
            <input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ej: VERANO20" required style={{ textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Tipo de descuento">
              <select className="input-field" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>
            </Field>
            <Field label={form.discountType === 'percentage' ? "Porcentaje" : "Monto"}>
              <input className="input-field" type="number" min="1" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder={form.discountType === 'percentage' ? "Ej: 15" : "Ej: 2000"} required />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Máximo de usos (vacío = ilimitado)">
              <input className="input-field" type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Sin límite" />
            </Field>
            <Field label="Fecha de expiración">
              <input className="input-field" type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
            </Field>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text)" }}>
            <input type="checkbox" checked={!form.isAccumulable} onChange={(e) => setForm({ ...form, isAccumulable: !e.target.checked })} style={{ width: 18, height: 18, accentColor: primary }} />
            <i className="ti ti-shield-lock" style={{ fontSize: 16, color: "var(--text2)" }} />
            Descuento único (no se acumula con otros)
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
            <button type="submit" disabled={submitting} style={{ ...btnSolid, background: primary, opacity: submitting ? 0.7 : 1 }}>
              <i className={`ti ${isEdit ? "ti-device-floppy" : "ti-plus"}`} style={{ fontSize: 16 }} />
              {isEdit ? "Guardar cambios" : "Crear cupón"}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}


// ════════════════════════════════════════════════════════
//  SUBCOMPONENTES: PROMOCIONES
// ════════════════════════════════════════════════════════

function PromotionRow({ promotion, primary, onEdit, onDelete }) {
  const typeLabel = promotion.promotionType === 'bogo' ? 'Compra X lleva Y' : 'Monto mínimo';
  const rewardLabel = promotion.rewardDiscountType === 'free' ? 'Gratis' : promotion.rewardDiscountType === 'percentage' ? `${promotion.rewardValue}% dcto` : `$${promotion.rewardValue?.toLocaleString("es-CL")} dcto`;

  return (
    <article className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="ti ti-gift" style={{ fontSize: 19, color: "#dc2626" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {promotion.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: "#ede9fe", color: "#6d28d9" }}>{typeLabel}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: "#fef3c7", color: "#92400e" }}>Premio: {rewardLabel}</span>
            {promotion.ConditionProduct && <span style={{ fontSize: 12, color: "var(--text2)" }}>Condición: {promotion.ConditionProduct.name}</span>}
            {promotion.RewardProduct && <span style={{ fontSize: 12, color: "var(--text2)" }}>Producto premio: {promotion.RewardProduct.name}</span>}
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: promotion.isActive ? "#dcfce7" : "#fee2e2", color: promotion.isActive ? "#15803d" : "#dc2626" }}>
              {promotion.isActive ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={btnSmall}><i className="ti ti-edit" style={{ fontSize: 15 }} /> Editar</button>
        <button onClick={onDelete} style={{ ...btnSmall, color: "#dc2626", borderColor: "#fca5a5" }}><i className="ti ti-trash" style={{ fontSize: 15 }} /></button>
      </div>
    </article>
  );
}

function PromotionModal({ data, productos, primary, onClose, onSave }) {
  const [form, setForm] = useState({ ...data });
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!form.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSave(form);
    setSubmitting(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div className="card" style={{ width: "min(620px, 100%)", padding: 24, position: "relative", boxShadow: "0 28px 80px rgba(15,23,42,0.32)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={isEdit ? "Editar promoción" : "Nueva promoción"} subtitle="Configura una promoción condicional para el carrito" onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Nombre de la promoción">
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Compra 2 pizzas y lleva 1 bebida gratis" required />
          </Field>

          <Field label="Tipo de promoción">
            <select className="input-field" value={form.promotionType} onChange={(e) => setForm({ ...form, promotionType: e.target.value })}>
              <option value="bogo">Compra X y lleva Y (BOGO)</option>
              <option value="threshold">Descuento por monto mínimo</option>
            </select>
          </Field>

          {/* Condición */}
          <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 18px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
              <i className="ti ti-filter" style={{ fontSize: 18, color: "var(--text2)" }} />
              Condición
            </label>
            {form.promotionType === 'bogo' ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Producto requerido">
                  <select className="input-field" value={form.conditionProductId} onChange={(e) => setForm({ ...form, conditionProductId: e.target.value })}>
                    <option value="">Cualquier producto</option>
                    {productos.filter(p => p.isActive !== false).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </Field>
                <Field label="Cantidad mínima">
                  <input className="input-field" type="number" min="1" value={form.conditionMinQuantity} onChange={(e) => setForm({ ...form, conditionMinQuantity: e.target.value })} placeholder="Ej: 2" />
                </Field>
              </div>
            ) : (
              <Field label="Monto mínimo en el carrito ($)">
                <input className="input-field" type="number" min="1" value={form.conditionMinAmount} onChange={(e) => setForm({ ...form, conditionMinAmount: e.target.value })} placeholder="Ej: 15000" />
              </Field>
            )}
          </div>

          {/* Recompensa */}
          <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 18px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
              <i className="ti ti-gift" style={{ fontSize: 18, color: "#dc2626" }} />
              Recompensa
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Producto de premio">
                <select className="input-field" value={form.rewardProductId} onChange={(e) => setForm({ ...form, rewardProductId: e.target.value })}>
                  <option value="">Descuento al total</option>
                  {productos.filter(p => p.isActive !== false).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </Field>
              <Field label="Tipo de premio">
                <select className="input-field" value={form.rewardDiscountType} onChange={(e) => setForm({ ...form, rewardDiscountType: e.target.value })}>
                  <option value="free">Gratis (100% dcto)</option>
                  <option value="percentage">Porcentaje de descuento</option>
                  <option value="fixed">Monto fijo de descuento</option>
                </select>
              </Field>
            </div>
            {form.rewardDiscountType !== 'free' && (
              <div style={{ marginTop: 14 }}>
                <Field label={form.rewardDiscountType === 'percentage' ? "Porcentaje" : "Monto"}>
                  <input className="input-field" type="number" min="1" value={form.rewardValue} onChange={(e) => setForm({ ...form, rewardValue: e.target.value })} placeholder={form.rewardDiscountType === 'percentage' ? "Ej: 50" : "Ej: 3000"} />
                </Field>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
            <button type="submit" disabled={submitting} style={{ ...btnSolid, background: primary, opacity: submitting ? 0.7 : 1 }}>
              <i className={`ti ${isEdit ? "ti-device-floppy" : "ti-plus"}`} style={{ fontSize: 16 }} />
              {isEdit ? "Guardar cambios" : "Crear promoción"}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}