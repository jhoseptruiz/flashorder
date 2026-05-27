import User from "./User.js";
import Customer from "./Customer.js";
import Category from "./Category.js";
import CompositionRule from "./CompositionRule.js";
import Product from "./Product.js";
import ProductVariant from "./ProductVariant.js";
import CustomerOrder from "./CustomerOrder.js";
import OrderItem from "./OrderItem.js";
import AuditLog from "./AuditLog.js";
import SystemConfig from "./SystemConfig.js";

// ==========================================
// CATÁLOGO Y REGLAS DE COMPOSICIÓN
// ==========================================

// Category "agrupa" Products
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

// Products "dispara bases de" Categories (Para armar pizzas, etc)
Category.hasMany(Product, { foreignKey: 'baseCategoryId', as: 'CompositeProducts' });
Product.belongsTo(Category, { foreignKey: 'baseCategoryId', as: 'BaseCategory' });

// Category "define_base" y "define_complemento" en CompositionRules
Category.hasMany(CompositionRule, { foreignKey: 'baseCategoryId', as: 'BaseRules' });
CompositionRule.belongsTo(Category, { foreignKey: 'baseCategoryId', as: 'BaseCategory' });

Category.hasMany(CompositionRule, { foreignKey: 'allowedCategoryId', as: 'AllowedRules' });
CompositionRule.belongsTo(Category, { foreignKey: 'allowedCategoryId', as: 'AllowedCategory' });

// Products "posee" ProductVariants
Product.hasMany(ProductVariant, { foreignKey: 'productId' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });

// ==========================================
// OPERACIONES (PEDIDOS)
// ==========================================

// Customers "realiza" CustomerOrders
Customer.hasMany(CustomerOrder, { foreignKey: 'customerId' });
CustomerOrder.belongsTo(Customer, { foreignKey: 'customerId' });

// Users "gestiona" CustomerOrders (Relacionado por RUT)
User.hasMany(CustomerOrder, { foreignKey: 'createdByRut', sourceKey: 'rut' });
CustomerOrder.belongsTo(User, { foreignKey: 'createdByRut', targetKey: 'rut' });

// CustomerOrders "se desglosa en" OrderItems
CustomerOrder.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(CustomerOrder, { foreignKey: 'orderId' });

// ProductVariants "incluida en" OrderItems
ProductVariant.hasMany(OrderItem, { foreignKey: 'variantId' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'variantId' });

// ==========================================
// AUDITORÍA
// ==========================================

// Users "genera" AuditLogs (Relacionado por RUT)
User.hasMany(AuditLog, { foreignKey: 'userRut', sourceKey: 'rut' });
AuditLog.belongsTo(User, { foreignKey: 'userRut', targetKey: 'rut' });

export {
  User,
  Customer,
  Category,
  CompositionRule,
  Product,
  ProductVariant,
  CustomerOrder,
  OrderItem,
  AuditLog,
  SystemConfig
};