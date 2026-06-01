import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const SystemConfig = sequelize.define("SystemConfig", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  appName: {
    type: DataTypes.STRING,
  },
  logoPath: {
    type: DataTypes.STRING,
  },
  backupIntervalHours: {
    type: DataTypes.INTEGER,
  },
  backupEmail: {
    type: DataTypes.STRING,
  }
}, {
  tableName: "system_configs",
});

export default SystemConfig;