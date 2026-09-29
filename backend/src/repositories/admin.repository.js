import pool from "../config/database.js";

export async function listAdminUsers({ search = "", role = "", status = "", limit = 50, offset = 0 }) {
	const result = await pool.query(
		`SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_login,
		        COUNT(DISTINCT c.id)::integer AS conversation_count
		 FROM users u
		 LEFT JOIN conversations c ON c.user_id = u.id
		 WHERE ($1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2)
		   AND ($3 = '' OR u.role = $3)
		   AND ($4 = '' OR u.status = $4)
		 GROUP BY u.id
		 ORDER BY u.created_at DESC
		 LIMIT $5 OFFSET $6`,
		[search, `%${search}%`, role, status, limit, offset],
	);
	return result.rows;
}

export async function countAdminUsers({ search = "", role = "", status = "" }) {
	const result = await pool.query(
		`SELECT COUNT(*)::integer AS total FROM users u
		 WHERE ($1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2)
		   AND ($3 = '' OR u.role = $3) AND ($4 = '' OR u.status = $4)`,
		[search, `%${search}%`, role, status],
	);
	return result.rows[0].total;
}

export async function findAdminUser(id) {
	const result = await pool.query(
		`SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_login,
		        COUNT(DISTINCT c.id)::integer AS conversation_count,
		        COUNT(m.id)::integer AS message_count
		 FROM users u
		 LEFT JOIN conversations c ON c.user_id = u.id
		 LEFT JOIN messages m ON m.conversation_id = c.id
		 WHERE u.id = $1 GROUP BY u.id`,
		[id],
	);
	return result.rows[0];
}

export async function updateAdminUser(id, { role, status }) {
	const result = await pool.query(
		`UPDATE users SET role = COALESCE($2, role), status = COALESCE($3, status)
		 WHERE id = $1 RETURNING id, name, email, role, status, created_at, last_login`,
		[id, role ?? null, status ?? null],
	);
	return result.rows[0];
}

export async function deleteAdminUser(id) {
	const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id, name, email", [id]);
	return result.rows[0];
}

export async function listAdminConversations({ search = "", userId = "", mode = "", limit = 50, offset = 0 }) {
	const result = await pool.query(
		`SELECT c.id, c.title, c.mode, c.created_at, c.updated_at,
		        u.id AS user_id, u.name AS owner_name, u.email AS owner_email,
		        COUNT(m.id)::integer AS message_count
		 FROM conversations c JOIN users u ON u.id = c.user_id
		 LEFT JOIN messages m ON m.conversation_id = c.id
		 WHERE ($1 = '' OR c.title ILIKE $2 OR u.name ILIKE $2 OR u.email ILIKE $2)
		   AND ($3::bigint IS NULL OR c.user_id = $3::bigint)
		   AND ($4 = '' OR c.mode = $4)
		 GROUP BY c.id, u.id
		 ORDER BY c.updated_at DESC LIMIT $5 OFFSET $6`,
		[search, `%${search}%`, userId, mode, limit, offset],
	);
	return result.rows;
}

export async function deleteAdminConversation(id) {
	const result = await pool.query(
		"DELETE FROM conversations WHERE id = $1 RETURNING id, title, user_id",
		[id],
	);
	return result.rows[0];
}

export async function writeAdminActivity({ adminId, action, targetType, targetId, description, metadata = {} }) {
	await pool.query(
		`INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, description, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
		[adminId, action, targetType, targetId == null ? null : String(targetId), description, JSON.stringify(metadata)],
	);
}

export async function listAdminActivity({ limit = 50, offset = 0 }) {
	const result = await pool.query(
		`SELECT a.id, a.action, a.target_type, a.target_id, a.description, a.metadata, a.created_at,
		        u.name AS admin_name, u.email AS admin_email
		 FROM admin_activity_logs a LEFT JOIN users u ON u.id = a.admin_id
		 ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
		[limit, offset],
	);
	return result.rows;
}