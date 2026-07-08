import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const Category = sequelize.define("Category", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  behavior: {
    type: DataTypes.ENUM('base', 'complemento', 'independiente'),
    defaultValue: 'independiente',
    allowNull: false,
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  minItems: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  maxItems: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  discountType: {
    type: DataTypes.ENUM('none', 'percentage', 'fixed'),
    defaultValue: 'none',
    allowNull: false,
  },
  discountValue: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  discountActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  isAccumulable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  discountExpirationDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  discountActiveDays: {
    type: DataTypes.JSON, // Will store array of numbers 0-6 (Sun-Sat)
    allowNull: true,
  },
}, {
  tableName: "categories",
});

export default Category;