"use strict";
import sequelize from "../db/db.js";
import { Category, Product, ProductVariant, CompositionRule } from "../models/index.models.js";

async function seedCatalog() {
  try {
    console.log("Iniciando seed de catálogo...");

    // 1. Categorías
    const [catBebidas] = await Category.findOrCreate({
      where: { name: "Bebidas" },
      defaults: { behavior: "independiente", displayOrder: 1, isActive: true }
    });

    const [catPizzas] = await Category.findOrCreate({
      where: { name: "Pizzas" },
      defaults: { behavior: "independiente", displayOrder: 2, isActive: true }
    });

    const [catMasas] = await Category.findOrCreate({
      where: { name: "Masas de Pizza" },
      defaults: { behavior: "base", displayOrder: 3, isActive: true }
    });

    const [catIngredientes] = await Category.findOrCreate({
      where: { name: "Ingredientes Extra" },
      defaults: { behavior: "complemento", displayOrder: 4, isActive: true }
    });

    console.log("Categorías listas.");

    // 2. Productos simples y variantes
    const [prodCoca] = await Product.findOrCreate({
      where: { name: "Coca Cola" },
      defaults: { categoryId: catBebidas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodCoca.id, variantName: "1 Litro" }, defaults: { price: 1500, isActive: true } });
    await ProductVariant.findOrCreate({ where: { productId: prodCoca.id, variantName: "2 Litros" }, defaults: { price: 2500, isActive: true } });

    const [prodMargarita] = await Product.findOrCreate({
      where: { name: "Pizza Margarita" },
      defaults: { categoryId: catPizzas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodMargarita.id, variantName: "Familiar" }, defaults: { price: 10000, isActive: true } });
    await ProductVariant.findOrCreate({ where: { productId: prodMargarita.id, variantName: "Mediana" }, defaults: { price: 8000, isActive: true } });

    // 3. Productos para componentes
    const [prodMasaTrad] = await Product.findOrCreate({
      where: { name: "Masa Tradicional" },
      defaults: { categoryId: catMasas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodMasaTrad.id, variantName: "Única" }, defaults: { price: 3000, isActive: true } });

    const [prodMasaPiedra] = await Product.findOrCreate({
      where: { name: "Masa a la Piedra" },
      defaults: { categoryId: catMasas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodMasaPiedra.id, variantName: "Única" }, defaults: { price: 3500, isActive: true } });

    const [prodQueso] = await Product.findOrCreate({
      where: { name: "Extra Queso" },
      defaults: { categoryId: catIngredientes.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodQueso.id, variantName: "Porción" }, defaults: { price: 1000, isActive: true } });

    const [prodPeppe] = await Product.findOrCreate({
      where: { name: "Pepperoni" },
      defaults: { categoryId: catIngredientes.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodPeppe.id, variantName: "Porción" }, defaults: { price: 1500, isActive: true } });

    // 4. Producto compuesto (Pizza Personalizada)
    const [prodCustom] = await Product.findOrCreate({
      where: { name: "Pizza Personalizada" },
      defaults: { 
        categoryId: catPizzas.id, 
        isComposite: true, 
        baseCategoryId: catMasas.id,
        isActive: true 
      }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodCustom.id, variantName: "Base" }, defaults: { price: 0, isActive: true } });

    console.log("Productos y variantes listos.");

    // 5. Reglas de composición
    await CompositionRule.findOrCreate({
      where: { baseCategoryId: catMasas.id, allowedCategoryId: catMasas.id },
      defaults: { minItems: 1, maxItems: 1, stepOrder: 1 }
    });

    await CompositionRule.findOrCreate({
      where: { baseCategoryId: catMasas.id, allowedCategoryId: catIngredientes.id },
      defaults: { minItems: 0, maxItems: 5, stepOrder: 2 }
    });

    console.log("Reglas de composición listas.");
    console.log("✅ Seed completado exitosamente.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  }
}

seedCatalog();
