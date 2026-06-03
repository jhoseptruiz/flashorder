import { Op } from "sequelize";
import { Product, ProductVariant, Category } from "../models/index.models.js";
import sequelize from "../db/db.js";

// GET /api/catalog/products?categoryId=uuid&search=texto
export const getProducts = async (req, res) => {
  try {
    const { categoryId, search } = req.query;

    // Construir condiciones de filtro
    const where = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (search && search.trim()) {
      where.name = { [Op.iLike]: `%${search.trim()}%` };
    }

    const products = await Product.findAll({
      where,
      include: [
        { model: ProductVariant, as: "variants" },
        { model: Category, attributes: ["id", "name", "behavior"] },
      ],
      order: [["name", "ASC"]],
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos", details: error.message });
  }
};

// POST /api/catalog/products
export const createProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, categoryId, isComposite, baseCategoryId, variants } = req.body;

    // Validaciones
    if (!name || !name.trim()) {
      await transaction.rollback();
      return res.status(400).json({ error: "El nombre del producto es obligatorio" });
    }
    if (!categoryId) {
      await transaction.rollback();
      return res.status(400).json({ error: "La categoría es obligatoria" });
    }
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: "Debe tener al menos una variante con nombre y precio" });
    }

    // Validar que la categoría existe
    const category = await Category.findByPk(categoryId, { transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({ error: "La categoría seleccionada no existe" });
    }

    // Si es compuesto, validar la categoría base
    if (isComposite && !baseCategoryId) {
      await transaction.rollback();
      return res.status(400).json({ error: "Los productos compuestos requieren una categoría base" });
    }

    // Crear el producto
    const newProduct = await Product.create(
      {
        name: name.trim(),
        categoryId,
        isComposite: isComposite || false,
        baseCategoryId: isComposite ? baseCategoryId : null,
      },
      { transaction }
    );

    // Crear las variantes
    const variantData = variants.map((v) => ({
      productId: newProduct.id,
      variantName: v.variantName.trim(),
      price: parseInt(v.price),
    }));

    await ProductVariant.bulkCreate(variantData, { transaction });

    await transaction.commit();

    // Recargar con includes para devolver el producto completo
    const fullProduct = await Product.findByPk(newProduct.id, {
      include: [
        { model: ProductVariant, as: "variants" },
        { model: Category, attributes: ["id", "name", "behavior"] },
      ],
    });

    res.status(201).json(fullProduct);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: "Error al crear producto", details: error.message });
  }
};

// PUT /api/catalog/products/:id
export const updateProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, categoryId, isComposite, baseCategoryId, isActive, variants } = req.body;

    const product = await Product.findByPk(id, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Actualizar campos del producto
    if (name !== undefined) product.name = name.trim();
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (isComposite !== undefined) product.isComposite = isComposite;
    if (baseCategoryId !== undefined) product.baseCategoryId = isComposite ? baseCategoryId : null;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save({ transaction });

    // Sincronizar variantes si se enviaron
    if (variants && Array.isArray(variants)) {
      if (variants.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: "Debe tener al menos una variante" });
      }

      // Obtener IDs de variantes enviadas (las que ya existen)
      const sentIds = variants.filter((v) => v.id).map((v) => v.id);

      // Eliminar variantes que ya no están
      await ProductVariant.destroy({
        where: {
          productId: id,
          ...(sentIds.length > 0 ? { id: { [Op.notIn]: sentIds } } : {}),
        },
        transaction,
      });

      // Crear o actualizar cada variante
      for (const v of variants) {
        if (v.id) {
          // Actualizar existente
          await ProductVariant.update(
            { variantName: v.variantName.trim(), price: parseInt(v.price) },
            { where: { id: v.id, productId: id }, transaction }
          );
        } else {
          // Crear nueva
          await ProductVariant.create(
            {
              productId: id,
              variantName: v.variantName.trim(),
              price: parseInt(v.price),
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    // Devolver producto actualizado completo
    const fullProduct = await Product.findByPk(id, {
      include: [
        { model: ProductVariant, as: "variants" },
        { model: Category, attributes: ["id", "name", "behavior"] },
      ],
    });

    res.json(fullProduct);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: "Error al actualizar producto", details: error.message });
  }
};

// DELETE /api/catalog/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Eliminar variantes primero (cascade debería hacerlo, pero por seguridad)
    await ProductVariant.destroy({ where: { productId: id } });
    await product.destroy();

    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar producto", details: error.message });
  }
};