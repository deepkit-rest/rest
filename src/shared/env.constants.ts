import { config } from "dotenv";
import { env } from "process";

config();

/* eslint-disable @typescript-eslint/no-unused-vars */
const num = (k: string) => Number(env[k]);
const str = (k: string) => env[k];
const bool = (k: string) =>
  env[k] === "true" ? true : env[k] === "false" ? false : undefined;
/* eslint-enable @typescript-eslint/no-unused-vars */

export const DEBUG = bool("DEBUG");
export const DB_URL = str("DB_URL");
