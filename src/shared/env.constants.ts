import { config } from "dotenv";
import { env } from "process";

config();

/* eslint-disable @typescript-eslint/no-unused-vars */
const num = (k: string) => env[k] && Number(env[k]);
const str = (k: string) => env[k];
const bool = (k: string) =>
  env[k] === "true" ? true : env[k] === "false" ? false : undefined;
/* eslint-enable @typescript-eslint/no-unused-vars */

export const PORT = num("PORT") ?? 8080;
export const DEBUG = bool("DEBUG") ?? false;
export const DB_URL = str("DB_URL") ?? "data/db.sqlite3";
