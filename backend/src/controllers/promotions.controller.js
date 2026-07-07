import { Promotion, Product, ProductVariant, Category } from "../models/index.models.js";
import { createAuditLog } from "../helpers/audit.helper.js";

// GET /api/catalog/promotions
export const getPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll({
      include: [
        { model: Product, as: "ConditionProduct", attributes: ["id", "name"], include: [{ model: Category, attributes: ["id", "name"] }] },
        { model: Product, as: "RewardProduct", attributes: ["id", "name"], include: [{ model: ProductVariant, as: "variants", attributes: ["id", "variantName", "price"] }] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener promociones", details: error.message });
  }
};

// POST /api/catalog/promotions
export const createPromotion = async (req, res) => {
  try {
    const { name, promotionType, conditionProductId, conditionMinQuantity, conditionMinAmount, rewardProductId, rewardDiscountType, rewardValue } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "El nombre de la promoción es obligatorio" });
    }
    if (!promotionType || !['bogo', 'threshold'].includes(promotionType)) {
      return res.status(400).json({ error: "El tipo de promoción debe ser 'bogo' o 'threshold'" });
    }

    const newPromotion = await Promotion.create({
      name: name.trim(),
      promotionType,
      conditionProductId: conditionProductId || null,
      conditionMinQuantity: conditionMinQuantity ? parseInt(conditionMinQuantity) : null,
      conditionMinAmount: conditionMinAmount ? parseInt(conditionMinAmount) : null,
      rewardProductId: rewardProductId || null,
      rewardDiscountType: rewardDiscountType || 'free',
      rewardValue: parseInt(rewardValue) || 0,
    });

    await createAuditLog(req.user.rut, "CREATE", "promotions", newPromotion.id, null, { name: name.trim(), promotionType });

    // Reload with includes
    const full = await Promotion.findByPk(newPromotion.id, {
      include: [
        { model: Product, as: "ConditionProduct", attributes: ["id", "name"] },
        { model: Product, as: "RewardProduct", attributes: ["id", "name"] },
      ],
    });

    res.status(201).json(full);
  } catch (error) {
    res.status(500).json({ error: "Error al crear promoción", details: error.message });
  }
};

// PUT /api/catalog/promotions/:id
export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, promotionType, conditionProductId, conditionMinQuantity, conditionMinAmount, rewardProductId, rewardDiscountType, rewardValue, isActive } = req.body;

    const promotion = await Promotion.findByPk(id);
    if (!promotion) {
      return res.status(404).json({ error: "Promoción no encontrada" });
    }

    const oldData = promotion.toJSON();

    if (name !== undefined) promotion.name = name.trim();
    if (promotionType !== undefined) promotion.promotionType = promotionType;
    if (conditionProductId !== undefined) promotion.conditionProductId = conditionProductId || null;
    if (conditionMinQuantity !== undefined) promotion.conditionMinQuantity = conditionMinQuantity ? parseInt(conditionMinQuantity) : null;
    if (conditionMinAmount !== undefined) promotion.conditionMinAmount = conditionMinAmount ? parseInt(conditionMinAmount) : null;
    if (rewardProductId !== undefined) promotion.rewardProductId = rewardProductId || null;
    if (rewardDiscountType !== undefined) promotion.rewardDiscountType = rewardDiscountType;
    if (rewardValue !== undefined) promotion.rewardValue = parseInt(rewardValue) || 0;
    if (isActive !== undefined) promotion.isActive = isActive;

    await promotion.save();

    await createAuditLog(req.user.rut, "UPDATE", "promotions", id, oldData, promotion.toJSON());

    const full = await Promotion.findByPk(id, {
      include: [
        { model: Product, as: "ConditionProduct", attributes: ["id", "name"] },
        { model: Product, as: "RewardProduct", attributes: ["id", "name"] },
      ],
    });

    res.json(full);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar promoción", details: error.message });
  }
};

// DELETE /api/catalog/promotions/:id
export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findByPk(id);
    if (!promotion) {
      return res.status(404).json({ error: "Promoción no encontrada" });
    }

    await promotion.destroy();
    await createAuditLog(req.user.rut, "DELETE", "promotions", id, { name: promotion.name }, null);

    res.json({ message: "Promoción eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar promoción", details: error.message });
  }
};
