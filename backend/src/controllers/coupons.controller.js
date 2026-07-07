import { Coupon } from "../models/index.models.js";
import { createAuditLog } from "../helpers/audit.helper.js";

// GET /api/catalog/coupons
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener cupones", details: error.message });
  }
};

// POST /api/catalog/coupons
export const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, maxUses, expirationDate, isAccumulable } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: "El código del cupón es obligatorio" });
    }
    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({ error: "El tipo de descuento debe ser 'percentage' o 'fixed'" });
    }
    if (!discountValue || parseInt(discountValue) <= 0) {
      return res.status(400).json({ error: "El valor del descuento debe ser mayor a 0" });
    }

    const newCoupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: parseInt(discountValue),
      maxUses: maxUses ? parseInt(maxUses) : null,
      expirationDate: expirationDate || null,
      isAccumulable: !!isAccumulable,
    });

    await createAuditLog(req.user.rut, "CREATE", "coupons", newCoupon.id, null, { code: newCoupon.code, discountType, discountValue });

    res.status(201).json(newCoupon);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe un cupón con ese código" });
    }
    res.status(500).json({ error: "Error al crear cupón", details: error.message });
  }
};

// PUT /api/catalog/coupons/:id
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discountType, discountValue, maxUses, expirationDate, isActive, isAccumulable } = req.body;

    const coupon = await Coupon.findByPk(id);
    if (!coupon) {
      return res.status(404).json({ error: "Cupón no encontrado" });
    }

    const oldData = coupon.toJSON();

    if (code !== undefined) coupon.code = code.trim().toUpperCase();
    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = parseInt(discountValue) || 0;
    if (maxUses !== undefined) coupon.maxUses = maxUses ? parseInt(maxUses) : null;
    if (expirationDate !== undefined) coupon.expirationDate = expirationDate || null;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (isAccumulable !== undefined) coupon.isAccumulable = isAccumulable;

    await coupon.save();

    await createAuditLog(req.user.rut, "UPDATE", "coupons", id, oldData, coupon.toJSON());

    res.json(coupon);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe un cupón con ese código" });
    }
    res.status(500).json({ error: "Error al actualizar cupón", details: error.message });
  }
};

// DELETE /api/catalog/coupons/:id
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByPk(id);
    if (!coupon) {
      return res.status(404).json({ error: "Cupón no encontrado" });
    }

    await coupon.destroy();
    await createAuditLog(req.user.rut, "DELETE", "coupons", id, { code: coupon.code }, null);

    res.json({ message: "Cupón eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar cupón", details: error.message });
  }
};

// POST /api/catalog/coupons/validate — Validar un cupón desde el POS
export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: "El código del cupón es obligatorio" });
    }

    const coupon = await Coupon.findOne({ where: { code: code.trim().toUpperCase() } });
    if (!coupon) {
      return res.status(404).json({ error: "Cupón no encontrado" });
    }
    if (!coupon.isActive) {
      return res.status(400).json({ error: "Este cupón está desactivado" });
    }
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      return res.status(400).json({ error: "Este cupón ya alcanzó su límite de usos" });
    }
    if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
      return res.status(400).json({ error: "Este cupón ha expirado" });
    }

    res.json({
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      isAccumulable: coupon.isAccumulable,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al validar cupón", details: error.message });
  }
};
