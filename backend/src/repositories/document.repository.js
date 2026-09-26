import pool from "../config/database.js";

export async function createDocument({ userId, originalName, storedName, fileType, fileSize }) {
	const result = await pool.query(
		`INSERT INTO documents (user_id, original_name, stored_name, file_type, file_size, status)
		 VALUES ($1, $2, $3, $4, $5, 'uploaded')
		 RETURNING id, original_name, stored_name, file_type, file_size, status, created_at`,
		[userId, originalName, storedName, fileType, fileSize]
	);
	return result.rows[0];
}

export async function listDocumentsByUser(userId) {
	const result = await pool.query(
		`SELECT id, original_name, file_type, file_size, status, created_at
		 FROM documents WHERE user_id = $1 ORDER BY created_at DESC`,
		[userId]
	);
	return result.rows;
}

export async function findDocumentById(id, userId) {
	const result = await pool.query(
		`SELECT id, user_id, original_name, stored_name, file_type, file_size, status, created_at
		 FROM documents WHERE id = $1 AND user_id = $2 LIMIT 1`,
		[id, userId]
	);
	return result.rows[0];
}

export async function listOwnedDocumentIds(userId, documentIds) {
	const result = await pool.query(
		"SELECT id FROM documents WHERE user_id = $1 AND id = ANY($2::bigint[])",
		[userId, documentIds]
	);
	return result.rows.map((row) => String(row.id));
}

export async function updateDocumentStatus(id, status) {
	await pool.query("UPDATE documents SET status = $2 WHERE id = $1", [id, status]);
}

export async function deleteDocument(id, userId) {
	const result = await pool.query(
		"DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING stored_name",
		[id, userId]
	);
	return result.rows[0];
}
