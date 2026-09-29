import pool from "../config/database.js";

export async function createConversation(userId, title = "New Chat", mode = "general") {
	const result = await pool.query(
		`INSERT INTO conversations (user_id, title, mode)
		 VALUES ($1, $2, $3)
		 RETURNING id, title, mode, created_at, updated_at`,
		[userId, title, mode],
	);
	return result.rows[0];
}

export async function listConversations(userId) {
	const result = await pool.query(
		`SELECT c.id, c.title, c.mode, c.created_at, c.updated_at,
		        COUNT(m.id)::integer AS message_count
		 FROM conversations c
		 LEFT JOIN messages m ON m.conversation_id = c.id
		 WHERE c.user_id = $1
		 GROUP BY c.id
		 ORDER BY c.updated_at DESC`,
		[userId],
	);
	return result.rows;
}

export async function findConversation(conversationId, userId) {
	const result = await pool.query(
		`SELECT id, title, mode, created_at, updated_at FROM conversations
		 WHERE id = $1 AND user_id = $2 LIMIT 1`,
		[conversationId, userId],
	);
	return result.rows[0];
}

export async function updateConversation(conversationId, userId, { title, mode }) {
	const result = await pool.query(
		`UPDATE conversations
		 SET title = COALESCE($3, title), mode = COALESCE($4, mode), updated_at = NOW()
		 WHERE id = $1 AND user_id = $2
		 RETURNING id, title, mode, created_at, updated_at`,
		[conversationId, userId, title ?? null, mode ?? null],
	);
	return result.rows[0];
}

export async function getRecentMessages(conversationId, limit = 20) {
	const result = await pool.query(
		`SELECT id, role, content, sources, created_at
		 FROM (
		   SELECT id, role, content, sources, created_at
		   FROM messages
		   WHERE conversation_id = $1
		   ORDER BY created_at DESC, id DESC
		   LIMIT $2
		 ) recent
		 ORDER BY created_at ASC, id ASC`,
		[conversationId, limit],
	);
	return result.rows.map((message) => ({
		...message,
		sources: Array.isArray(message.sources) ? message.sources : [],
	}));
}

export async function getConversationWithMessages(conversationId, userId) {
	const conversation = await findConversation(conversationId, userId);
	if (!conversation) return null;
	const result = await pool.query(
		`SELECT id, role, content, sources, created_at FROM messages
		 WHERE conversation_id = $1 ORDER BY created_at ASC, id ASC`,
		[conversationId],
	);
	const messages = result.rows.map((message) => ({
		...message,
		sources: Array.isArray(message.sources) ? message.sources : [],
	}));
	return { ...conversation, messages };
}

export async function addMessage(conversationId, role, content, sources = [], clientMessageId = null) {
	const normalizedSources = role === "assistant" && Array.isArray(sources) ? sources : [];
	const result = await pool.query(
		`WITH inserted AS (
		   INSERT INTO messages (conversation_id, role, content, sources, client_message_id)
		   VALUES ($1, $2, $3, $4::jsonb, $5::uuid)
		   ON CONFLICT (conversation_id, client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING
		   RETURNING id, conversation_id, role, content, sources, created_at
		 ), touched AS (
		   UPDATE conversations SET updated_at = NOW()
		   WHERE id = $1 AND EXISTS (SELECT 1 FROM inserted)
		   RETURNING id
		 )
		 SELECT id, role, content, sources, created_at FROM inserted`,
		[conversationId, role, content, JSON.stringify(normalizedSources), clientMessageId],
	);
	return result.rows[0];
}

export async function updateMessageContent(messageId, content) {
	const result = await pool.query(
		`UPDATE messages SET content = $2, sources = '[]'::jsonb
		 WHERE id = $1 AND role = 'assistant'
		 RETURNING id, role, content, sources, created_at`,
		[messageId, content],
	);
	return result.rows[0];
}

export async function deleteConversation(conversationId, userId) {
	const result = await pool.query(
		"DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id",
		[conversationId, userId],
	);
	return result.rowCount > 0;
}
