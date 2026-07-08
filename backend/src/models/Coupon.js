import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const Coupon = sequelize.define("Coupon", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false,
  },
  discountValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  maxUses: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  currentUses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  expirationDate: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  isAccumulable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: "coupons",
  timestamps: true,
});

export default Coupon;
