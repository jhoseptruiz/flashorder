import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const CashRegisterTransaction = sequelize.define("CashRegisterTransaction", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM("income", "expense"),
    allowNull: false,
  },
  amount: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "cash_register_transactions",
});

export default CashRegisterTransaction;
