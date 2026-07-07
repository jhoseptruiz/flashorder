"use strict";

/**
 * uberEatsMenu.service.js — Sincronización del catálogo de FlashOrder con el menú de Uber Eats.
 *
 * Transforma la estructura interna (Categories → Products → ProductVariants)
 * al formato JSON requerido por Uber Eats (menus → categories → items → modifier_groups).
 */

import { Category, Product, ProductVariant, CompositionRule } from "../models/index.models.js";
import { uploadMenu } from "./uberEatsApi.service.js";

/**
 * Construye el payload JSON del menú en el formato de Uber Eats.
 *
 * Mapeo:
 *  - Category (independiente) → Uber categories[]
 *  - Product                  → Uber items[]
 *  - ProductVariant           → Si hay 1 sola variante: price directo.
 *                                Si hay múltiples: se crea un modifier_group.
 *  - Category (base/complemento) → modifier_groups[] para productos compuestos.
 */
export async function buildUberMenuPayload() {
  // Obtener todas las categorías activas
  const allCategories = await Category.findAll({
    where: { isActive: true },
    order: [["displayOrder", "ASC"]],
  });

  // Obtener todos los productos activos con sus variantes
  const allProducts = await Product.findAll({
    where: { isActive: true },
    include: [
      { model: ProductVariant, as: "variants", where: { isActive: true }, required: false },
      { model: Category, attributes: ["id", "name", "behavior"] },
    ],
    order: [["name", "ASC"]],
  });

  // Obtener reglas de composición para productos compuestos
  const allRules = await CompositionRule.findAll({
    include: [
      { model: Category, as: "AllowedCategory", attributes: ["id", "name", "behavior"] },
    ],
    order: [["stepOrder", "ASC"]],
  });

  const uberCategories = [];
  const uberItems = [];
  const uberModifierGroups = [];
  const uberCategoryIds = [];

  // ── Categorías independientes → Uber categories ───────────────────────────
  const independentCategories = allCategories.filter(c => c.behavior === "independiente");

  for (const cat of independentCategories) {
    const catProducts = allProducts.filter(p => p.categoryId === cat.id);
    if (catProducts.length === 0) continue; // No enviar categorías vacías

    const itemIds = catProducts.map(p => p.id);

    uberCategories.push({
      id: cat.id,
      title: { translations: { es: cat.name } },
      item_ids: itemIds,
    });
    uberCategoryIds.push(cat.id);

    // ── Procesar cada producto ─────────────────────────────────────────────
    for (const product of catProducts) {
      const variants = product.variants || [];
      const modGroupIds = [];

      // Si el producto tiene múltiples variantes → crear modifier_group de variantes
      if (variants.length > 1) {
        const varModGroupId = `vargroup-${product.id}`;
        uberModifierGroups.push({
          id: varModGroupId,
          title: { translations: { es: "Tamaño / Variante" } },
          quantity_info: { quantity: { min_quantity: 1, max_quantity: 1 } },
          modifier_options: variants.map(v => ({
            id: v.id,
            title: { translations: { es: v.variantName } },
            price_info: { price: v.price, currency_code: "CLP" },
          })),
        });
        modGroupIds.push(varModGroupId);
      }

      // Si es producto compuesto → agregar modifier_groups de bases y complementos
      if (product.isComposite) {
        // Buscar las categorías base/complemento que apuntan a esta categoría independiente
        const relatedProducts = allProducts.filter(p => p.relatedCategoryId === cat.id);
        const relatedCatIds = [...new Set(relatedProducts.map(p => p.categoryId))];

        for (const relCatId of relatedCatIds) {
          const relCategory = allCategories.find(c => c.id === relCatId);
          if (!relCategory) continue;

          const options = relatedProducts
            .filter(p => p.categoryId === relCatId)
            .map(p => {
              const firstVariant = (p.variants || [])[0];
              return {
                id: p.id,
                title: { translations: { es: p.name } },
                price_info: {
                  price: firstVariant ? firstVariant.price : 0,
                  currency_code: "CLP",
                },
              };
            });

          if (options.length === 0) continue;

          const modGroupId = `compgroup-${product.id}-${relCatId}`;
          uberModifierGroups.push({
            id: modGroupId,
            title: { translations: { es: `Elige ${relCategory.name}` } },
            quantity_info: {
              quantity: {
                min_quantity: relCategory.minItems || (relCategory.behavior === "base" ? 1 : 0),
                max_quantity: relCategory.maxItems || (relCategory.behavior === "base" ? 1 : 5),
              },
            },
            modifier_options: options,
          });
          modGroupIds.push(modGroupId);
        }
      }

      // Precio del item: usar la primera variante (o 0 si hay modifier_groups)
      const basePrice = variants.length === 1 ? variants[0].price : 0;

      uberItems.push({
        id: product.id,
        title: { translations: { es: product.name } },
        price_info: { price: basePrice, currency_code: "CLP" },
        ...(modGroupIds.length > 0 ? { modifier_group_ids: modGroupIds } : {}),
      });
    }
  }

  return {
    menus: [
      {
        id: "flashorder-menu-principal",
        title: { translations: { es: "Menú Principal" } },
        category_ids: uberCategoryIds,
      },
    ],
    categories: uberCategories,
    items: uberItems,
    modifier_groups: uberModifierGroups,
  };
}

/**
 * Sincroniza el menú completo de FlashOrder con Uber Eats.
 * Construye el payload y lo envía via PUT.
 *
 * @returns {{ ok: boolean, status: number, data: any }}
 */
export async function syncMenuToUber() {
  try {
    console.log("[UberMenu] 🔄 Iniciando sincronización de menú...");
    const payload = await buildUberMenuPayload();

    console.log(`[UberMenu] 📊 Payload: ${payload.categories.length} categorías, ${payload.items.length} items, ${payload.modifier_groups.length} modifier groups`);

    const result = await uploadMenu(payload);

    if (result.ok) {
      console.log("[UberMenu] ✅ Menú sincronizado exitosamente con Uber Eats");
    } else {
      console.error(`[UberMenu] ❌ Error sincronizando menú (${result.status}):`, result.data);
    }

    return result;
  } catch (error) {
    console.error("[UberMenu] ❌ Error en syncMenuToUber:", error.message);
    throw error;
  }
}

/**
 * Dispara la sincronización de forma asíncrona (fire-and-forget).
 * Para usar en controllers después de crear/editar/eliminar productos o categorías.
 */
export function triggerMenuSync() {
  syncMenuToUber().catch(err => {
    console.error("[UberMenu] Error en sync de fondo:", err.message);
  });
}
