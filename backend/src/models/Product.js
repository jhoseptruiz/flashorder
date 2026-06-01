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
  externalID:{
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: "products",
});

export default Product;