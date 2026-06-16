import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const CustomerOrder = sequelize.define("CustomerOrder", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderDate: {
    type: DataTypes.DATE, // TIMESTAMPTZ
  },
  deliveryDate: {
    type: DataTypes.DATE,
  },
  totalAmount: {
    type: DataTypes.BIGINT, // BIGINT para CLP
    allowNull: false,
    defaultValue: 0,
  },
  depositAmount: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
  },
  source: {
    type: DataTypes.ENUM('local', 'uber_eats'),
    allowNull: false,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  companyLogo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.STRING,
  },
  externalOrderId: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('pendiente_uber', 'pendiente', 'en_cocina', 'empacado', 'entregado'),
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  cashReceived: {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: 0,
  },
  cashChange: {
    type: DataTypes.BIGINT,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  tableName: "customer_orders",
});

export default CustomerOrder;