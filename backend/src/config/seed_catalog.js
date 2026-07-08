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

    const [catEmpanadas] = await Category.findOrCreate({
      where: { name: "Empanadas" },
      defaults: { behavior: "independiente", displayOrder: 3, isActive: true }
    });

    const [catMasas] = await Category.findOrCreate({
      where: { name: "Masas de Pizza" },
      defaults: { behavior: "base", displayOrder: 4, isActive: true, minItems: 1, maxItems: 1 }
    });

    const [catIngredientes] = await Category.findOrCreate({
      where: { name: "Ingredientes Extra" },
      defaults: { behavior: "complemento", displayOrder: 5, isActive: true, minItems: 0, maxItems: 5 }
    });

    console.log("Categorías listas.");

    // 2. Productos simples y variantes
    // BEBIDAS
    const [prodCoca] = await Product.findOrCreate({
      where: { name: "Coca Cola" },
      defaults: { categoryId: catBebidas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodCoca.id, variantName: "Lata 350ml" }, defaults: { price: 1500, isActive: true } });
    await ProductVariant.findOrCreate({ where: { productId: prodCoca.id, variantName: "1.5 Litros" }, defaults: { price: 2500, isActive: true } });

    const [prodSprite] = await Product.findOrCreate({
      where: { name: "Sprite" },
      defaults: { categoryId: catBebidas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodSprite.id, variantName: "Lata 350ml" }, defaults: { price: 1500, isActive: true } });
    await ProductVariant.findOrCreate({ where: { productId: prodSprite.id, variantName: "1.5 Litros" }, defaults: { price: 2500, isActive: true } });

    // PIZZAS CLÁSICAS
    const [prodMargarita] = await Product.findOrCreate({
      where: { name: "Pizza Margarita" },
      defaults: { categoryId: catPizzas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodMargarita.id, variantName: "Mediana" }, defaults: { price: 8000, isActive: true } });
    await ProductVariant.findOrCreate({ where: { productId: prodMargarita.id, variantName: "Familiar" }, defaults: { price: 11000, isActive: true } });

    const [prodPeppePizza] = await Product.findOrCreate({
      where: { name: "Pizza Pepperoni" },
      defaults: { categoryId: catPizzas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodPeppePizza.id, variantName: "Mediana" }, defaults: { price: 9500, isActive: true } });
    await ProductVariant.findOrCreate({ where: { productId: prodPeppePizza.id, variantName: "Familiar" }, defaults: { price: 13000, isActive: true } });

    // EMPANADAS
    const [prodEmpanadaPino] = await Product.findOrCreate({
      where: { name: "Empanada de Pino" },
      defaults: { categoryId: catEmpanadas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodEmpanadaPino.id, variantName: "Unidad" }, defaults: { price: 2500, isActive: true } });

    const [prodEmpanadaQueso] = await Product.findOrCreate({
      where: { name: "Empanada de Queso" },
      defaults: { categoryId: catEmpanadas.id, isComposite: false, isActive: true }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodEmpanadaQueso.id, variantName: "Unidad" }, defaults: { price: 2200, isActive: true } });


    // 3. Productos para componentes (con relatedCategoryId apuntando a Pizzas)
    const [prodMasaTrad] = await Product.findOrCreate({
      where: { name: "Masa Tradicional" },
      defaults: { categoryId: catMasas.id, isComposite: false, isActive: true, relatedCategoryId: catPizzas.id }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodMasaTrad.id, variantName: "Familiar" }, defaults: { price: 4000, isActive: true } });

    const [prodMasaPiedra] = await Product.findOrCreate({
      where: { name: "Masa a la Piedra" },
      defaults: { categoryId: catMasas.id, isComposite: false, isActive: true, relatedCategoryId: catPizzas.id }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodMasaPiedra.id, variantName: "Familiar" }, defaults: { price: 4500, isActive: true } });

    const [prodQueso] = await Product.findOrCreate({
      where: { name: "Extra Queso" },
      defaults: { categoryId: catIngredientes.id, isComposite: false, isActive: true, relatedCategoryId: catPizzas.id }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodQueso.id, variantName: "Porción" }, defaults: { price: 1500, isActive: true } });

    const [prodPeppe] = await Product.findOrCreate({
      where: { name: "Pepperoni" },
      defaults: { categoryId: catIngredientes.id, isComposite: false, isActive: true, relatedCategoryId: catPizzas.id }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodPeppe.id, variantName: "Porción" }, defaults: { price: 1800, isActive: true } });
    
    const [prodChamp] = await Product.findOrCreate({
      where: { name: "Champiñones" },
      defaults: { categoryId: catIngredientes.id, isComposite: false, isActive: true, relatedCategoryId: catPizzas.id }
    });
    await ProductVariant.findOrCreate({ where: { productId: prodChamp.id, variantName: "Porción" }, defaults: { price: 1200, isActive: true } });


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
    console.log("✅ Seed de catálogo completado exitosamente.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  }
}

seedCatalog();
