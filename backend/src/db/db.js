"use strict";
import { Sequelize} from "sequelize";
import {
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
} from "../config/configEnv.js";

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: "postgres",
  logging: false,
  define:{
    timestamps: false,
    underscored: true,
    freezeTableName: true,
  },
});

export default sequelize;