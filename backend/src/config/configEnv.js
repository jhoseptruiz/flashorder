"use strict";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

const envFilePath = path.resolve(_dirname, "../../.env");
dotenv.config({ path: envFilePath });

export const PORT           = process.env.PORT;
export const HOST           = process.env.HOST;
export const NODE_ENV       = process.env.NODE_ENV;
export const DB_HOST        = process.env.DB_HOST;
export const DB_PORT        = process.env.DB_PORT;
export const DB_NAME        = process.env.DB_NAME;
export const DB_USER        = process.env.DB_USER;
export const DB_PASSWORD    = process.env.DB_PASSWORD;
export const JWT_SECRET     = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;