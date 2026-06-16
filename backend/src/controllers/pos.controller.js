"use strict";
import { createOrder, getCompositionRules } from "../services/pos.service.js";

export async function createOrderController(req, res) {
  try {
    const { customer, items, deliveryDate, depositAmount, paymentMethod, notes, companyName, companyLogo } = req.body;

    // Validaciones básicas
    if (!customer || !customer.fullName || !customer.phone) {
      return res.status(400).json({ error: "Nombre y teléfono del cliente son obligatorios" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "El pedido debe tener al menos un producto" });
    }

    // Validar cada item
    for (const item of items) {
      if (!item.productName || !item.quantity || !item.unitPrice) {
        return res.status(400).json({
          error: "Cada producto debe tener nombre, cantidad y precio",
        });
      }
      if (item.quantity < 1) {
        return res.status(400).json({ error: "La cantidad debe ser al menos 1" });
      }
      if (item.unitPrice < 0) {
        return res.status(400).json({ error: "El precio no puede ser negativo" });
      }
    }

    const order = await createOrder({
      customer,
      items,
      deliveryDate,
      depositAmount: depositAmount ? parseInt(depositAmount) : 0,
      paymentMethod,
      notes,
      companyName,
      companyLogo,
      createdByRut: req.user.rut,
    });

    res.status(201).json({
      message: "Pedido creado correctamente",
      order,
    });
  } catch (error) {
    console.error("Error en createOrderController:", error);
    res.status(500).json({
      error: error.message || "No se pudo crear el pedido",
    });
  }
}

export async function getCompositionRulesController(req, res) {
  try {
    const { baseCategoryId, independentCategoryId } = req.query;

    if (!baseCategoryId) {
      return res.status(400).json({ error: "baseCategoryId es requerido" });
    }

    const rules = await getCompositionRules(baseCategoryId, independentCategoryId || null);
    res.json(rules);
  } catch (error) {
    console.error("Error en getCompositionRulesController:", error);
    res.status(500).json({
      error: error.message || "No se pudieron obtener las reglas de composición",
    });
  }
}
