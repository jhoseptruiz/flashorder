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
  }
}, {
  tableName: "categories",
});

export default Category;