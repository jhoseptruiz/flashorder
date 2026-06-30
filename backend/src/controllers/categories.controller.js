import { Category, Product } from "../models/index.models.js";
import { createAuditLog } from "../helpers/audit.helper.js";

// GET /api/catalog/categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [["displayOrder", "ASC"]],
      include: [{
        model: Product,
        attributes: ["id"],
      }],
    });

    // Agregar conteo de productos a cada categoría
    const result = categories.map((cat) => {
      const data = cat.toJSON();
      data.productCount = data.Products ? data.Products.length : 0;
      delete data.Products;
      return data;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener categorías", details: error.message });
  }
};

// POST /api/catalog/categories
export const createCategory = async (req, res) => {
  try {
    const { name, behavior, displayOrder, minItems, maxItems, discountType, discountValue, discountActive, isAccumulable, discountExpirationDate, discountActiveDays } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const isBaseOrComplemento = behavior === "base" || behavior === "complemento";

    const newCategory = await Category.create({
      name: name.trim(),
      behavior: behavior || "independiente",
      displayOrder: displayOrder ?? 0,
      minItems: isBaseOrComplemento ? (minItems ?? 0) : 0,
      maxItems: isBaseOrComplemento ? (maxItems ?? null) : null,
      discountType: discountType || 'none',
      discountValue: parseInt(discountValue) || 0,
      discountActive: !!discountActive,
      isAccumulable: !!isAccumulable,
      discountExpirationDate: discountExpirationDate || null,
      discountActiveDays: Array.isArray(discountActiveDays) ? discountActiveDays : null,
    });

    // Registrar auditoría
    await createAuditLog(
      req.user.rut,
      "CREATE",
      "categories",
      newCategory.id,
      null,
      { name: name.trim(), behavior: behavior || "independiente", discountType: discountType || 'none' }
    );

    res.status(201).json(newCategory);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }
    res.status(500).json({ error: "Error al crear categoría", details: error.message });
  }
};

// PUT /api/catalog/categories/:id
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, behavior, displayOrder, isActive, minItems, maxItems, discountType, discountValue, discountActive, isAccumulable, discountExpirationDate, discountActiveDays } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const oldData = { name: category.name, behavior: category.behavior, displayOrder: category.displayOrder, isActive: category.isActive, minItems: category.minItems, maxItems: category.maxItems, discountType: category.discountType, discountValue: category.discountValue, discountActive: category.discountActive, isAccumulable: category.isAccumulable };

    if (name !== undefined) category.name = name.trim();
    if (behavior !== undefined) category.behavior = behavior;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (isActive !== undefined) category.isActive = isActive;

    const effectiveBehavior = behavior !== undefined ? behavior : category.behavior;
    const isBaseOrComplemento = effectiveBehavior === "base" || effectiveBehavior === "complemento";
    if (minItems !== undefined) category.minItems = isBaseOrComplemento ? minItems : 0;
    if (maxItems !== undefined) category.maxItems = isBaseOrComplemento ? maxItems : null;

    // Discount fields
    if (discountType !== undefined) category.discountType = discountType;
    if (discountValue !== undefined) category.discountValue = parseInt(discountValue) || 0;
    if (discountActive !== undefined) category.discountActive = discountActive;
    if (isAccumulable !== undefined) category.isAccumulable = isAccumulable;
    if (discountExpirationDate !== undefined) category.discountExpirationDate = discountExpirationDate || null;
    if (discountActiveDays !== undefined) category.discountActiveDays = Array.isArray(discountActiveDays) ? discountActiveDays : null;

    await category.save();

    // Registrar auditoría
    await createAuditLog(
      req.user.rut,
      "UPDATE",
      "categories",
      id,
      oldData,
      { name: category.name, behavior: category.behavior, displayOrder: category.displayOrder, isActive: category.isActive, discountType: category.discountType, discountValue: category.discountValue, discountActive: category.discountActive }
    );

    res.json(category);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }
    res.status(500).json({ error: "Error al actualizar categoría", details: error.message });
  }
};

// DELETE /api/catalog/categories/:id
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    // Verificar que no tenga productos asociados
    const productCount = await Product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: tiene ${productCount} producto(s) asociado(s). Mueve o elimina los productos primero.`,
      });
    }

    await category.destroy();

    // Registrar auditoría
    await createAuditLog(
      req.user.rut,
      "DELETE",
      "categories",
      id,
      { name: category.name },
      null
    );

    res.json({ message: "Categoría eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar categoría", details: error.message });
  }
};