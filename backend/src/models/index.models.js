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
import CashRegisterSession from "./CashRegisterSession.js";
import CashRegisterTransaction from "./CashRegisterTransaction.js";

// ==========================================
// CATÁLOGO Y REGLAS DE COMPOSICIÓN
// ==========================================

// Category "agrupa" Products
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

// Products "dispara bases de" Categories (Para armar pizzas, etc)
Category.hasMany(Product, { foreignKey: 'baseCategoryId', as: 'CompositeProducts' });
Product.belongsTo(Category, { foreignKey: 'baseCategoryId', as: 'BaseCategory' });

// Products "pertenece a categoría independiente" (ej: ingredientes de Pizza)
Category.hasMany(Product, { foreignKey: 'relatedCategoryId', as: 'RelatedBasesOrComplements' });
Product.belongsTo(Category, { foreignKey: 'relatedCategoryId', as: 'RelatedIndependentCategory' });

// Category "define_base" y "define_complemento" en CompositionRules
Category.hasMany(CompositionRule, { foreignKey: 'baseCategoryId', as: 'BaseRules' });
CompositionRule.belongsTo(Category, { foreignKey: 'baseCategoryId', as: 'BaseCategory' });

Category.hasMany(CompositionRule, { foreignKey: 'allowedCategoryId', as: 'AllowedRules' });
CompositionRule.belongsTo(Category, { foreignKey: 'allowedCategoryId', as: 'AllowedCategory' });

// Products "posee" ProductVariants
Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
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
// CAJA REGISTRADORA
// ==========================================

// Users "abre" CashRegisterSessions
User.hasMany(CashRegisterSession, { foreignKey: 'openedByRut', sourceKey: 'rut', as: 'OpenedSessions' });
CashRegisterSession.belongsTo(User, { foreignKey: 'openedByRut', targetKey: 'rut', as: 'OpenedBy' });

// Users "cierra" CashRegisterSessions
User.hasMany(CashRegisterSession, { foreignKey: 'closedByRut', sourceKey: 'rut', as: 'ClosedSessions' });
CashRegisterSession.belongsTo(User, { foreignKey: 'closedByRut', targetKey: 'rut', as: 'ClosedBy' });

// CashRegisterSessions "contiene" CashRegisterTransactions
CashRegisterSession.hasMany(CashRegisterTransaction, { foreignKey: 'sessionId', as: 'Transactions' });
CashRegisterTransaction.belongsTo(CashRegisterSession, { foreignKey: 'sessionId' });

// CashRegisterTransactions "vinculada a" CustomerOrders (opcional)
CustomerOrder.hasMany(CashRegisterTransaction, { foreignKey: 'orderId', as: 'CashTransactions' });
CashRegisterTransaction.belongsTo(CustomerOrder, { foreignKey: 'orderId' });

// CustomerOrders "vinculada a" CashRegisterSession
CashRegisterSession.hasMany(CustomerOrder, { foreignKey: 'cashRegisterSessionId', as: 'Orders' });
CustomerOrder.belongsTo(CashRegisterSession, { foreignKey: 'cashRegisterSessionId' });

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
  SystemConfig,
  CashRegisterSession,
  CashRegisterTransaction
};