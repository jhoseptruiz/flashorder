import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  isComposite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  externalId: {
    type: DataTypes.STRING(100),
    unique: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  relatedCategoryId: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  }
}, {
  tableName: "products",
});

export default Product;