import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  groupId: {
    type: DataTypes.UUID,
  },
  productNameSnapshot: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  variantNameSnapshot: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  unitPrice: {
    type: DataTypes.INTEGER, // Entero para CLP
    allowNull: false,
  },
  externalItemId: {
    type: DataTypes.STRING,
  },
  components: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  subtotal: {
    type: DataTypes.INTEGER,
  }
}, {
  tableName: "order_items",
});

export default OrderItem;