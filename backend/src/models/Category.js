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
  }
}, {
  tableName: "categories",
});

export default Category;