import { Category, Product } from "../models/index.models.js";

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
    const { name, behavior, displayOrder } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const newCategory = await Category.create({
      name: name.trim(),
      behavior: behavior || "independiente",
      displayOrder: displayOrder ?? 0,
    });

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
    const { name, behavior, displayOrder, isActive } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    if (name !== undefined) category.name = name.trim();
    if (behavior !== undefined) category.behavior = behavior;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
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
    res.json({ message: "Categoría eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar categoría", details: error.message });
  }
};