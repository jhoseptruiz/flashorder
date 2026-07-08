import {DataTypes} from "sequelize";
import sequelize from "../db/db.js";

const User = sequelize.define("User", {
    rut:{
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    fullName:{
        type: DataTypes.STRING(150),
        allowNull: false,
    },
    email:{
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
    },
    passwordHash:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    role:{
        type: DataTypes.ENUM('admin','empleado','cocinero'),
        allowNull: false,
    },
    isActive:{
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    }
}, {
    tableName: "users",
});

export default User;