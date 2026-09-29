import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../config/database.js";

const email = (process.env.DEFAULT_ADMIN_EMAIL || "admin@demo.com").trim().toLowerCase();
const password = process.env.DEFAULT_ADMIN_PASSWORD || "password";

if (process.env.NODE_ENV === "production" && (!process.env.DEFAULT_ADMIN_EMAIL || !process.env.DEFAULT_ADMIN_PASSWORD)) {
	throw new Error("Set DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD before seeding an admin in production");
}
if (!password) throw new Error("DEFAULT_ADMIN_PASSWORD must not be empty");

try {
	const passwordHash = await bcrypt.hash(password, 12);
	await pool.query(
		`INSERT INTO users (name, email, password_hash, role, status)
		 VALUES ('Demo Admin', $1, $2, 'admin', 'active')
		 ON CONFLICT (email) DO UPDATE
		 SET name = 'Demo Admin', password_hash = EXCLUDED.password_hash,
		     role = 'admin', status = 'active'`,
		[email, passwordHash],
	);
	console.log(`Ensured development admin account exists: ${email}`);
} catch (error) {
	console.error("Could not seed the development admin account:", error.message);
	process.exitCode = 1;
} finally {
	await pool.end();
}