import { DataTypes } from "sequelize";
import sequelize from "../db/db.js";

const CompositionRule = sequelize.define("CompositionRule", {
    id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    },
    minItems: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    },
    maxItems:{
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    stepOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    }

},{
    tableName: "composition_rules",
}); 

export default CompositionRule;