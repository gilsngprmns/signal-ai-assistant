import pg from "pg";
import "dotenv/config";
import { appConfig } from "./app.config.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: appConfig.database.poolMax,
  idleTimeoutMillis: appConfig.database.idleTimeoutMs,
  connectionTimeoutMillis: appConfig.database.connectionTimeoutMs,
  query_timeout: appConfig.database.queryTimeoutMs,
});

pool.on("error", (error) => {
	console.error("PostgreSQL pool error:", { code: error.code, name: error.name });
});

export default pool;