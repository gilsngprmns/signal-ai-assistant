import pool from "../config/database.js";

export async function recordAiUsage(entry) {
	await pool.query(
		`INSERT INTO ai_usage_logs
		 (user_id, conversation_id, model, mode, input_tokens, output_tokens, total_tokens,
		  response_time_ms, ttft_ms, status, error_code, contexts)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
		[entry.userId ?? null, entry.conversationId ?? null, entry.model, entry.mode,
			entry.inputTokens ?? null, entry.outputTokens ?? null, entry.totalTokens ?? null,
			entry.responseTimeMs ?? null, entry.ttftMs ?? null, entry.status, entry.errorCode ?? null,
			JSON.stringify(entry.contexts ?? [])],
	);
}

export async function getDashboardAnalytics({ geminiStatus }) {
	const [counts, series, recentUsers, recentConversations, recentActivity] = await Promise.all([
		pool.query(`SELECT
			(SELECT COUNT(*)::integer FROM users) AS total_users,
			(SELECT COUNT(*)::integer FROM conversations) AS total_conversations,
			(SELECT COUNT(*)::integer FROM messages) AS total_messages,
			(SELECT COUNT(*)::integer FROM ai_usage_logs WHERE created_at >= date_trunc('day', NOW())) AS ai_requests_today,
			(SELECT COUNT(*)::integer FROM users WHERE last_login >= NOW() - INTERVAL '30 days') AS active_users,
			(SELECT COUNT(*)::integer FROM ai_usage_logs WHERE status = 'failed') AS failed_ai_requests,
			(SELECT COALESCE(SUM(total_tokens), 0)::bigint FROM ai_usage_logs) AS estimated_token_usage,
			(SELECT ROUND(AVG(response_time_ms))::integer FROM ai_usage_logs WHERE status = 'success') AS average_response_time_ms,
			(SELECT ROUND(AVG(ttft_ms))::integer FROM ai_usage_logs WHERE status = 'success') AS average_ttft_ms`),
		pool.query(`WITH days AS (SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day')::date AS day)
			SELECT days.day, COUNT(log.id)::integer AS requests FROM days
			LEFT JOIN ai_usage_logs log ON log.created_at >= days.day AND log.created_at < days.day + INTERVAL '1 day'
			GROUP BY days.day ORDER BY days.day`),
		pool.query("SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 6"),
		pool.query(`SELECT c.id, c.title, c.mode, c.created_at, u.name AS owner_name,
			COUNT(m.id)::integer AS message_count FROM conversations c JOIN users u ON u.id = c.user_id
			LEFT JOIN messages m ON m.conversation_id = c.id GROUP BY c.id, u.id
			ORDER BY c.updated_at DESC LIMIT 6`),
		pool.query(`SELECT a.id, a.action, a.description, a.created_at, u.name AS admin_name
			FROM admin_activity_logs a LEFT JOIN users u ON u.id = a.admin_id
			ORDER BY a.created_at DESC LIMIT 6`),
	]);
	return {
		stats: counts.rows[0],
		requestsOverTime: series.rows,
		conversationsOverTime: await getConversationSeries(),
		activeUsersOverTime: await getActiveUserSeries(),
		recentUsers: recentUsers.rows,
		recentConversations: recentConversations.rows,
		recentActivity: recentActivity.rows,
		services: { database: "connected", gemini: geminiStatus },
	};
}

async function getConversationSeries() {
	const result = await pool.query(`WITH days AS (SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day')::date AS day)
		SELECT days.day, COUNT(c.id)::integer AS conversations FROM days
		LEFT JOIN conversations c ON c.created_at >= days.day AND c.created_at < days.day + INTERVAL '1 day'
		GROUP BY days.day ORDER BY days.day`);
	return result.rows;
}

async function getActiveUserSeries() {
	const result = await pool.query(`WITH days AS (SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day')::date AS day)
		SELECT days.day, COUNT(DISTINCT log.user_id)::integer AS active_users FROM days
		LEFT JOIN ai_usage_logs log ON log.created_at >= days.day AND log.created_at < days.day + INTERVAL '1 day' AND log.status = 'success'
		GROUP BY days.day ORDER BY days.day`);
	return result.rows;
}

export async function getUsageAnalytics({ days = 30, limit = 50, offset = 0 }) {
	const [summary, byMode, topUsers, logs] = await Promise.all([
		pool.query(`SELECT COUNT(*)::integer AS requests,
			COUNT(*) FILTER (WHERE status = 'success')::integer AS successful_requests,
			COUNT(*) FILTER (WHERE status = 'failed')::integer AS failed_requests,
			SUM(total_tokens)::bigint AS total_tokens,
			ROUND(AVG(response_time_ms))::integer AS average_response_time_ms,
			ROUND(AVG(ttft_ms))::integer AS average_ttft_ms
			FROM ai_usage_logs WHERE created_at >= NOW() - ($1::integer * INTERVAL '1 day')`, [days]),
		pool.query(`SELECT mode, COUNT(*)::integer AS requests, SUM(total_tokens)::bigint AS total_tokens
			FROM ai_usage_logs WHERE created_at >= NOW() - ($1::integer * INTERVAL '1 day')
			GROUP BY mode ORDER BY requests DESC`, [days]),
		pool.query(`SELECT u.id, u.name, u.email, COUNT(log.id)::integer AS requests,
			SUM(log.total_tokens)::bigint AS total_tokens FROM ai_usage_logs log
			JOIN users u ON u.id = log.user_id WHERE log.created_at >= NOW() - ($1::integer * INTERVAL '1 day')
			GROUP BY u.id ORDER BY requests DESC LIMIT 10`, [days]),
		pool.query(`SELECT log.id, log.model, log.mode, log.input_tokens, log.output_tokens, log.total_tokens,
			log.response_time_ms, log.ttft_ms, log.status, log.error_code, log.created_at, u.name AS user_name,
			log.contexts FROM ai_usage_logs log LEFT JOIN users u ON u.id = log.user_id
			WHERE log.created_at >= NOW() - ($1::integer * INTERVAL '1 day')
			ORDER BY log.created_at DESC LIMIT $2 OFFSET $3`, [days, limit, offset]),
	]);
	return { summary: summary.rows[0], byMode: byMode.rows, topUsers: topUsers.rows, logs: logs.rows };
}