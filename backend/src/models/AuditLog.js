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
    type: DataTypes.STRING,
  },
  oldData: {
    type: DataTypes.JSONB,
  },
  newData: {
    type: DataTypes.JSONB,
  },
  createdAt: {
    type: DataTypes.DATE, 
  }
}, {
  tableName: "audit_logs",
  timestamps: false, 
});

export default AuditLog;