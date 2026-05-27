import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const Customer = sequelize.define("Customer", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
  }
}, {
  tableName: "customers",
  timestamps: true,
  updatedAt: false, // Solo tiene created_at en tu SQL
});

export default Customer;