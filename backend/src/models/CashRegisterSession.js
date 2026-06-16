import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const CashRegisterSession = sequelize.define("CashRegisterSession", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  openingDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  closingDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  openingCash: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
  },
  expectedCash: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  closingCash: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  difference: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("open", "closed"),
    allowNull: false,
    defaultValue: "open",
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "cash_register_sessions",
});

export default CashRegisterSession;
