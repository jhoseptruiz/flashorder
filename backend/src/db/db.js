"use strict";
import pg from "pg";
import {
  DB_USER,
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
} from "../config/configEnv.js";

const { Pool } = pg;

const pool = new Pool({
  user:     DB_USER,
  host:     DB_HOST,
  database: DB_NAME,
  password: DB_PASSWORD,
  port:     DB_PORT,
});

pool.connect()
  .then(() => console.log("=> Conectado a PostgreSQL correctamente"))
  .catch((err) => console.error("Error conectando a PostgreSQL:", err));

export default pool; // borrar después