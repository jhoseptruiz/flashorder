import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const Promotion = sequelize.define("Promotion", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  promotionType: {
    type: DataTypes.ENUM('bogo', 'threshold'),
    allowNull: false,
  },
  conditionMinQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  conditionMinAmount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  rewardDiscountType: {
    type: DataTypes.ENUM('percentage', 'fixed', 'free'),
    allowNull: false,
    defaultValue: 'free',
  },
  rewardValue: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: "promotions",
  timestamps: true,
});

export default Promotion;
