import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const AuditLog = sequelize.define("AuditLog", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  action: {
    type: DataTypes.STRING,
  },
  tableAffected: {
    type: DataTypes.STRING,
  },
  recordId: {
    type: DataTypes.UUID,
  },
  oldData: {
    type: DataTypes.JSONB,
  },
  newData: {
    type: DataTypes.JSONB,
  },
  createdAt: {
    type: DataTypes.DATE, // TIMESTAMPTZ
  }
}, {
  tableName: "audit_logs",
  timestamps: false, // Como tienes tu campo createdAt manual
});

export default AuditLog;