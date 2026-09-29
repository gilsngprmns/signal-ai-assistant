import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pool from "../config/database.js";

const migrationPath = fileURLToPath(new URL("../../database/migrations/007_admin_platform.sql", import.meta.url));
const migration = await readFile(migrationPath, "utf8");
const client = await pool.connect();

try {
	await client.query("BEGIN");
	await client.query(migration);
	await client.query("COMMIT");
	console.log("Applied migration 007_admin_platform.sql");
} catch (error) {
	await client.query("ROLLBACK");
	console.error("Could not apply migration 007_admin_platform.sql:", error.message);
	process.exitCode = 1;
} finally {
	client.release();
	await pool.end();
}