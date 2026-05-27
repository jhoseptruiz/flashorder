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
  },
  source: {
    type: DataTypes.ENUM('local', 'uber_eats'),
    allowNull: false,
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
  }
}, {
  tableName: "customer_orders",
});

export default CustomerOrder;