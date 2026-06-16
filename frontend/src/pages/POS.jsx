import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCashRegister } from "../context/CashRegisterContext";
import { apiFetch } from "../utils/apiFetch";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CL")}`;

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS   = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

function calendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function POS() {
  const { user } = useAuth();
  const { primary, showToast, appName, appLogo } = useTheme();
  const { activeSession, refreshSession } = useCashRegister();

  // Catálogo
  const [categories, setCategories]     = useState([]);
  const [products, setProducts]         = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch]             = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Modal producto
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [itemNote, setItemNote]               = useState("");
  const [itemQty, setItemQty]                 = useState(1);

  // Modal producto compuesto
  const [compositionRules, setCompositionRules] = useState([]);
  const [compositeSelections, setCompositeSelections] = useState({});
  const [loadingRules, setLoadingRules] = useState(false);

  // Carrito
  const [cart, setCart] = useState([]);

  // Pedido
  const [customerName, setCustomerName]   = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [calMonth, setCalMonth]           = useState(new Date().getMonth());
  const [calYear, setCalYear]             = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay]     = useState(null);
  const [deliveryHour, setDeliveryHour]   = useState("12");
  const [deliveryMin, setDeliveryMin]     = useState("00");
  const [deliveryAmPm, setDeliveryAmPm]   = useState("PM");
  const [deposit, setDeposit]             = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [submitting, setSubmitting]       = useState(false);

  // Modal checkout
  const [showCheckout, setShowCheckout] = useState(false);
  const [cashReceived, setCashReceived] = useState("");

  // ── Cargar catálogo ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCatalog(true);
        const [catRes, prodRes] = await Promise.all([
          apiFetch("/api/catalog/categories"),
          apiFetch("/api/catalog/products"),
        ]);
        const catData  = await catRes.json();
        const prodData = await prodRes.json();
        if (catRes.ok) setCategories(catData);
        if (prodRes.ok) setProducts(prodData);
      } catch (e) {
        console.error("Error cargando catálogo:", e);
      } finally {
        setLoadingCatalog(false);
      }
    };
    load();
  }, []);

  // ── Filtrar productos ───────────────────────────────────────────────────────
  const validProducts = useMemo(() => {
    return products.filter(p => {
      if (p.isActive === false) return false;
      const cat = categories.find(c => c.id === p.categoryId);
      return cat && cat.behavior === "independiente";
    });
  }, [products, categories]);

  const filtered = useMemo(() => {
    let list = validProducts;
    if (activeCategory) list = list.filter((p) => p.categoryId === activeCategory);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s));
    }
    return list;
  }, [validProducts, activeCategory, search]);

  // Conteo por categoría
  const catCounts = useMemo(() => {
    const counts = {};
    validProducts.forEach((p) => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });
    return counts;
  }, [validProducts]);

  // Total del carrito
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.subtotal, 0), [cart]);

  const actualDeposit = useMemo(() => {
    return deposit !== "" ? (parseInt(deposit) || 0) : cartTotal;
  }, [deposit, cartTotal]);

  const changeAmount = useMemo(() => {
    return paymentMethod === "efectivo" && cashReceived !== "" ? Math.max(0, (parseInt(cashReceived) || 0) - actualDeposit) : 0;
  }, [paymentMethod, cashReceived, actualDeposit]);

  // ── Abrir modal de producto ─────────────────────────────────────────────────
  const openProduct = async (product) => {
    setSelectedProduct(product);
    setItemNote("");
    setItemQty(1);
    setCompositeSelections({});
    setCompositionRules([]);

    if (product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0].id);
    } else {
      setSelectedVariant("");
    }

    // Si es compuesto, cargar reglas de composición
    if (product.isComposite && product.baseCategoryId) {
      setLoadingRules(true);
      try {
        const res = await apiFetch(`/api/pos/composition-rules?baseCategoryId=${product.baseCategoryId}&independentCategoryId=${product.categoryId}`);
        if (res.ok) {
          const data = await res.json();
          setCompositionRules(data);
        }
      } catch (e) {
        console.error("Error cargando reglas:", e);
      } finally {
        setLoadingRules(false);
      }
    }
  };

  const closeProduct = () => {
    setSelectedProduct(null);
    setCompositionRules([]);
    setCompositeSelections({});
  };

  // ── Agregar al carrito ──────────────────────────────────────────────────────
  const addToCart = () => {
    if (!selectedProduct) return;

    if (selectedProduct.isComposite) {
      // Validar mínimos
      for (const rule of compositionRules) {
        const selections = compositeSelections[rule.id] || [];
        const minRequired = rule.minItems || 0;
        if (selections.length < minRequired) {
          showToast(`Selecciona al menos ${minRequired} ítem(s) de ${rule.AllowedCategory?.name || "una categoría"}`, "error");
          return;
        }
      }

      // Producto compuesto: armar nombre descriptivo
      const parts = compositionRules.map((rule) => {
        const selections = compositeSelections[rule.id] || [];
        if (selections.length === 0) return null;
        const catName = rule.AllowedCategory?.name || "Opción";
        const items = selections.map(s => `${s.product.name} (${s.variant.variantName})`).join(", ");
        return `${catName}: ${items}`;
      }).filter(Boolean);

      const variantDesc = parts.join(" | ");
      
      const componentsPrice = compositionRules.reduce((sum, rule) => {
        const selections = compositeSelections[rule.id] || [];
        return sum + selections.reduce((s, sel) => s + sel.variant.price, 0);
      }, 0);

      const baseVariant = selectedProduct.variants?.[0];
      const basePrice = baseVariant ? baseVariant.price : 0;
      const finalPrice = basePrice + componentsPrice;

      setCart((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          productName: selectedProduct.name,
          variantName: variantDesc || "Personalizado",
          variantId: baseVariant?.id || null,
          quantity: itemQty,
          unitPrice: finalPrice,
          subtotal: finalPrice * itemQty,
          notes: itemNote,
          groupId: crypto.randomUUID(),
          isComposite: true,
        },
      ]);
    } else {
      // Producto simple
      const variant = selectedProduct.variants?.find((v) => v.id === selectedVariant);
      if (!variant) {
        showToast("Selecciona una variante", "error");
        return;
      }

      setCart((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          productName: selectedProduct.name,
          variantName: variant.variantName,
          variantId: variant.id,
          quantity: itemQty,
          unitPrice: variant.price,
          subtotal: variant.price * itemQty,
          notes: itemNote,
          groupId: null,
          isComposite: false,
        },
      ]);
    }

    showToast("Producto agregado al carrito", "success");
    closeProduct();
  };

  // ── Modificar carrito ───────────────────────────────────────────────────────
  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: newQty * item.unitPrice };
      })
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // ── Calendario ──────────────────────────────────────────────────────────────
  const days = calendarDays(calYear, calMonth);
  const today = new Date();
  const isToday = (d) => d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  // ── Construir deliveryDate ──────────────────────────────────────────────────
  const buildDeliveryDate = () => {
    if (!selectedDay) return null;
    let h = parseInt(deliveryHour) || 12;
    const m = parseInt(deliveryMin) || 0;
    if (deliveryAmPm === "PM" && h < 12) h += 12;
    if (deliveryAmPm === "AM" && h === 12) h = 0;
    return new Date(calYear, calMonth, selectedDay, h, m);
  };

  // ── Guardar pedido ──────────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (cart.length === 0) { showToast("Agrega productos al carrito", "error"); return; }
    if (!customerName.trim()) { showToast("Ingresa el nombre del cliente", "error"); return; }
    if (!customerPhone.trim()) { showToast("Ingresa el teléfono del cliente", "error"); return; }

    const deliveryDate = buildDeliveryDate();

    setSubmitting(true);
    try {
      const body = {
        customer: {
          fullName: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim() || null,
        },
        items: cart.map((item) => ({
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          groupId: item.groupId,
        })),
        deliveryDate: deliveryDate ? deliveryDate.toISOString() : null,
        depositAmount: actualDeposit,
        paymentMethod,
        notes: "",
        cashReceived: paymentMethod === "efectivo" ? (parseInt(cashReceived) || 0) : 0,
        cashChange: paymentMethod === "efectivo" ? Math.max(0, (parseInt(cashReceived) || 0) - actualDeposit) : 0,
        companyName: appName,
        companyLogo: appLogo,
      };

      const res = await apiFetch("/api/pos/orders", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear pedido");

      showToast("¡Pedido creado correctamente!", "success");

      // Limpiar todo
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setSelectedDay(null);
      setDeposit("");
      setCashReceived("");
      setShowCheckout(false);
      // Refrescar estado de caja tras crear pedido
      refreshSession();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Estilos locales ─────────────────────────────────────────────────────────
  const S = {
    layout:    { display: "flex", gap: 0, height: "100%", animation: "fadein 0.3s ease", position: "relative" },
    catalog:   { flex: "1 1 60%", overflow: "auto", paddingRight: 20 },
    sidebar:   { flex: "0 0 340px", background: "var(--surface)", borderLeft: "1px solid var(--border)", borderRadius: 14, padding: 20, overflow: "auto", display: "flex", flexDirection: "column", gap: 14 },
    tabs:      { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 },
    tab:       (active) => ({ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: active ? primary : "var(--surface2)", color: active ? "#fff" : "var(--text2)", transition: "all 0.18s" }),
    search:    { marginBottom: 16 },
    grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 },
    card:      { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, cursor: "pointer", transition: "all 0.18s", textAlign: "center" },
    cardImg:   { width: "100%", height: 100, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, fontSize: 32, color: "var(--text2)" },
    overlay:   { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.54)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 },
    modal:     { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, width: "min(520px, 100%)", boxShadow: "0 28px 80px rgba(15, 23, 42, 0.32)", position: "relative" },
    label:     { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text2)" },
    btnPrimary: (disabled) => ({ background: primary, color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 700, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif", width: "100%" }),
    cartItem:  { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 },
    qtyBtn:    { width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text)" },
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  const cajaAbierta = !!activeSession;

  return (
    <div style={S.layout} className="pos-layout">
      {/* ═══ BLOQUEO SI CAJA CERRADA ═══ */}
      {!cajaAbierta && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(6px)",
          borderRadius: 14,
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "36px 40px", textAlign: "center",
            boxShadow: "0 28px 80px rgba(15, 23, 42, 0.32)",
            maxWidth: 380, animation: "fadein 0.3s ease",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "linear-gradient(135deg, #dc2626, #f97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <i className="ti ti-lock" style={{ fontSize: 28, color: "#fff" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 8px", fontFamily: "Syne, sans-serif" }}>Caja Cerrada</h2>
            <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 4px" }}>Debes abrir la caja desde el panel lateral para comenzar a registrar pedidos.</p>
          </div>
        </div>
      )}

      {/* ═══ PANEL IZQUIERDO — CATÁLOGO ═══ */}
      <div style={S.catalog}>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 16, letterSpacing: "-0.3px" }}>
          Punto de Venta
        </h1>

        {/* Tabs de categorías */}
        <div style={S.tabs}>
          <button style={S.tab(!activeCategory)} onClick={() => setActiveCategory(null)}>
            Menú <span style={{ opacity: 0.7, marginLeft: 4 }}>{validProducts.length}</span>
          </button>
          {categories.filter(c => c.isActive !== false && c.behavior === "independiente").sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((cat) => (
            <button key={cat.id} style={S.tab(activeCategory === cat.id)} onClick={() => setActiveCategory(cat.id)}>
              {cat.name} <span style={{ opacity: 0.7, marginLeft: 4 }}>{catCounts[cat.id] || 0}</span>
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div style={S.search}>
          <input
            className="input-field"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "var(--surface)" }}
          />
        </div>

        {/* Grid de productos */}
        {loadingCatalog ? (
          <div style={{ color: "var(--text2)", fontSize: 13, padding: 20 }}>Cargando catálogo...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "var(--text2)", fontSize: 13, padding: 20 }}>No se encontraron productos</div>
        ) : (
          <div style={S.grid}>
            {filtered.map((prod) => {
              const minPrice = prod.variants?.length > 0
                ? Math.min(...prod.variants.filter(v => v.isActive !== false).map((v) => v.price))
                : 0;
              return (
                <div
                  key={prod.id}
                  style={S.card}
                  onClick={() => openProduct(prod)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = primary; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
                >
                  <div style={S.cardImg}>
                    <i className={`ti ${prod.isComposite ? "ti-puzzle" : "ti-package"}`} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {prod.name}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: primary }}>
                    {minPrice > 0 ? fmt(minPrice) : "Consultar"}
                  </div>
                  {prod.isComposite && (
                    <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 4 }}>Personalizable</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ PANEL DERECHO — PEDIDO ═══ */}
      <div style={S.sidebar} className="pos-sidebar">
        <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 8 }}>Pedido</h2>

        {/* Items del carrito */}
        <div style={{ flex: 1, overflow: "auto", minHeight: 80 }}>
          {cart.length === 0 ? (
            <div style={{ color: "var(--text2)", fontSize: 12, textAlign: "center", padding: 20, opacity: 0.6 }}>
              <i className="ti ti-shopping-cart" style={{ fontSize: 28, display: "block", marginBottom: 6 }} />
              Carrito vacío
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} style={S.cartItem}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.productName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>{item.variantName}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button style={S.qtyBtn} onClick={() => updateQty(item.id, -1)}>-</button>
                  <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: "center" }}>{item.quantity}</span>
                  <button style={S.qtyBtn} onClick={() => updateQty(item.id, 1)}>+</button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", minWidth: 70, textAlign: "right" }}>{fmt(item.subtotal)}</div>
                <button onClick={() => removeItem(item.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#dc2626", fontSize: 14 }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totales */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
            <span>Total</span>
            <span>{fmt(cartTotal)}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ color: "var(--text2)", fontWeight: 600 }}>Abono</span>
            <input
              className="input-field"
              type="number"
              placeholder={fmt(cartTotal)}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              style={{ flex: 1, padding: "6px 10px" }}
              min="0"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ color: "var(--text2)", fontWeight: 600, whiteSpace: "nowrap" }}>Método de pago</span>
            <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ flex: 1, padding: "6px 10px" }}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>

          {/* Calculadora de vuelto (solo efectivo) */}
          {paymentMethod === "efectivo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ color: "var(--text2)", fontWeight: 600, whiteSpace: "nowrap" }}>Paga con</span>
                <input
                  className="input-field"
                  type="number"
                  placeholder="$ 0"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px" }}
                  min="0"
                />
              </div>
              {cashReceived !== "" && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", borderRadius: 8,
                  background: changeAmount >= 0 ? "#dcfce7" : "#fee2e2",
                  border: `1px solid ${changeAmount >= 0 ? "#86efac" : "#fca5a5"}`,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: changeAmount >= 0 ? "#15803d" : "#dc2626" }}>Vuelto:</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: changeAmount >= 0 ? "#15803d" : "#dc2626" }}>{fmt(changeAmount)}</span>
                </div>
              )}
            </div>
          )}

          <button
            style={S.btnPrimary(submitting || cart.length === 0)}
            disabled={submitting || cart.length === 0}
            onClick={() => setShowCheckout(true)}
          >
            {submitting ? "Guardando..." : "Guardar Pedido"}
          </button>
        </div>
      </div>

      {/* ═══ MODAL PRODUCTO SIMPLE / COMPUESTO ═══ */}
      {selectedProduct && (
        <div style={S.overlay} onClick={closeProduct}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <button onClick={closeProduct} style={{ position: "absolute", top: 14, right: 14, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 999, width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <i className="ti ti-x" />
            </button>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 18, fontFamily: "Syne, sans-serif" }}>
              {selectedProduct.name}
            </h2>

            {selectedProduct.isComposite ? (
              /* ── Producto Compuesto ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {loadingRules ? (
                  <div style={{ color: "var(--text2)", fontSize: 13 }}>Cargando opciones...</div>
                ) : compositionRules.length === 0 ? (
                  <div style={{ color: "var(--text2)", fontSize: 13 }}>No hay reglas de composición configuradas para este producto</div>
                ) : (
                  compositionRules.map((rule) => {
                    const cat = rule.AllowedCategory;
                    if (!cat) return null;
                    const prods = cat.Products || [];
                    const selections = compositeSelections[rule.id] || [];
                    const minItems = rule.minItems || 0;
                    const maxItems = rule.maxItems || null;
                    const canAdd = maxItems === null || selections.length < maxItems;
                    const meetsMin = selections.length >= minItems;

                    return (
                      <div key={rule.id} style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 16px", border: !meetsMin && selections.length === 0 ? "1px solid #f59e0b44" : "1px solid transparent" }}>
                        {/* Header con nombre y contador */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{cat.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: meetsMin ? "#dcfce7" : "#fef3c7", color: meetsMin ? "#15803d" : "#92400e" }}>
                            {selections.length}{maxItems ? `/${maxItems}` : ""} {minItems > 0 ? `(mín: ${minItems})` : "(opcional)"}
                          </span>
                        </div>

                        {/* Selector para agregar */}
                        {canAdd && (
                          <select
                            className="input-field"
                            value=""
                            onChange={(e) => {
                              const variantId = e.target.value;
                              if (!variantId) return;
                              let foundProduct = null;
                              let foundVariant = null;
                              for (const p of prods) {
                                const v = p.variants?.find(v => v.id === variantId);
                                if (v) {
                                  foundProduct = p;
                                  foundVariant = v;
                                  break;
                                }
                              }
                              if (foundVariant) {
                                setCompositeSelections((prev) => ({
                                  ...prev,
                                  [rule.id]: [...(prev[rule.id] || []), { product: foundProduct, variant: foundVariant }],
                                }));
                              }
                            }}
                            style={{ marginBottom: selections.length > 0 ? 10 : 0 }}
                          >
                            <option value="">+ Agregar {cat.name.toLowerCase()}...</option>
                            {prods.flatMap(p => 
                              (p.variants || []).filter(v => v.isActive !== false).map(v => (
                                <option key={v.id} value={v.id}>
                                  {p.name} - {v.variantName} (+{fmt(v.price)})
                                </option>
                              ))
                            )}
                          </select>
                        )}

                        {/* Lista de selecciones */}
                        {selections.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {selections.map((sel, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{sel.product.name}</span>
                                  <span style={{ fontSize: 12, color: "var(--text2)", marginLeft: 6 }}>{sel.variant.variantName}</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: primary, marginRight: 8 }}>+{fmt(sel.variant.price)}</span>
                                <button
                                  onClick={() => {
                                    setCompositeSelections((prev) => {
                                      const updated = [...(prev[rule.id] || [])];
                                      updated.splice(idx, 1);
                                      return { ...prev, [rule.id]: updated };
                                    });
                                  }}
                                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "#dc2626", fontSize: 15, padding: 2 }}
                                >
                                  <i className="ti ti-x" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* ── Producto Simple ── */
              <label style={S.label}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Tipo:</span>
                <select
                  className="input-field"
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                >
                  {selectedProduct.variants?.filter(v => v.isActive !== false).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.variantName} — {fmt(v.price)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Cantidad */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>Cantidad:</span>
              <button style={S.qtyBtn} onClick={() => setItemQty(Math.max(1, itemQty - 1))}>-</button>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{itemQty}</span>
              <button style={S.qtyBtn} onClick={() => setItemQty(itemQty + 1)}>+</button>
            </div>

            {/* Nota */}
            <label style={{ ...S.label, marginTop: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Nota:</span>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Instrucciones especiales..."
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                style={{ resize: "vertical", fontFamily: "'DM Sans', sans-serif" }}
              />
            </label>

            <button style={{ ...S.btnPrimary(false), marginTop: 18 }} onClick={addToCart}>
              Agregar al carrito
            </button>
          </div>
        </div>
      )}

      {/* ═══ MODAL CHECKOUT ═══ */}
      {showCheckout && (
        <div style={S.overlay} onClick={() => setShowCheckout(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowCheckout(false)} style={{ position: "absolute", top: 14, right: 14, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 999, width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <i className="ti ti-x" />
            </button>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 18, fontFamily: "Syne, sans-serif" }}>Pedido</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={S.label}>
                Nombre completo:
                <input className="input-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre completo" />
              </label>
              <label style={S.label}>
                Teléfono:
                <input className="input-field" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Teléfono" />
              </label>
              <label style={S.label}>
                Gmail: <span style={{ fontWeight: 400, fontStyle: "italic" }}>(opcional)</span>
                <input className="input-field" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="correo@gmail.com" />
              </label>

              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                {/* Mini calendario */}
                <div style={{ background: "var(--surface2)", borderRadius: 10, padding: 10, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <button onClick={prevMonth} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text)", fontSize: 16 }}>
                      <i className="ti ti-chevron-left" />
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: primary }}>{MONTHS[calMonth]} {calYear}</span>
                    <button onClick={nextMonth} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text)", fontSize: 16 }}>
                      <i className="ti ti-chevron-right" />
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
                    {DAYS.map((d) => (
                      <div key={d} style={{ fontSize: 10, fontWeight: 700, color: "var(--text2)", padding: 2 }}>{d}</div>
                    ))}
                    {days.map((d, i) => (
                      <div key={i}
                        onClick={() => d && setSelectedDay(d)}
                        style={{
                          padding: 4, borderRadius: 6, fontSize: 11, fontWeight: isToday(d) ? 700 : 500,
                          cursor: d ? "pointer" : "default",
                          background: d === selectedDay ? `${primary}20` : "transparent",
                          border: d === selectedDay ? `2px solid ${primary}` : isToday(d) ? `1px solid ${primary}40` : "1px solid transparent",
                          color: d ? "var(--text)" : "transparent",
                        }}
                      >
                        {d || "."}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hora de retiro */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--text2)", flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>Hora retiro:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input className="input-field" value={deliveryHour} onChange={(e) => setDeliveryHour(e.target.value)} style={{ width: 50, textAlign: "center", padding: "6px 8px" }} maxLength={2} />
                    <span>:</span>
                    <input className="input-field" value={deliveryMin} onChange={(e) => setDeliveryMin(e.target.value)} style={{ width: 50, textAlign: "center", padding: "6px 8px" }} maxLength={2} />
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    {["AM", "PM"].map((v) => (
                      <button key={v} onClick={() => setDeliveryAmPm(v)}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: deliveryAmPm === v ? primary : "transparent", color: deliveryAmPm === v ? "#fff" : "var(--text2)", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", flex: 1 }}
                      >{v}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Resumen pedido:</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text2)", fontWeight: 600 }}>Abono:</span>
                    <span style={{ color: "var(--text)" }}>{fmt(actualDeposit)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
                    <span>Total:</span>
                    <span>{fmt(cartTotal)}</span>
                  </div>
                </div>
              </div>

              <button
                style={S.btnPrimary(submitting)}
                disabled={submitting}
                onClick={handleSubmitOrder}
              >
                {submitting ? "Procesando..." : "Finalizar Pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
