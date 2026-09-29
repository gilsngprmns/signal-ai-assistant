export default function errorMiddleware(error, req, res, next) {
	if (res.headersSent) {
		return next(error);
	}

	const requestedStatus = Number.isInteger(error.statusCode)
		? error.statusCode
		: Number.isInteger(error.status) && error.status < 500 ? error.status : 500;
	if (requestedStatus >= 500) {
		console.error("API request failed:", process.env.NODE_ENV === "production"
			? { name: error.name, code: error.code, statusCode: requestedStatus }
			: error);
	} else if (process.env.NODE_ENV !== "production" && requestedStatus >= 400) {
		console.warn("API client error:", { name: error.name, statusCode: requestedStatus, path: req.path });
	}
	if (error.code === "42703" && /column ["']?(ttft_ms|client_message_id)["']?/i.test(error.message)) {
		return res.status(503).json({
			success: false,
			message: "Chat performance schema is incomplete. In backend CMD, run: pnpm migrate:chat-performance, then restart the backend.",
		});
	}
	if (error.code === "42703" && /column ["']?(role|status|last_login)["']?/i.test(error.message)) {
		return res.status(503).json({
			success: false,
			message: "Authentication schema is incomplete. Apply migration 007_admin_platform.sql, then restart the backend.",
		});
	}
	if (error.code === "42703" && (error.column === "mode" || /column ["']mode["']/.test(error.message))) {
		return res.status(503).json({
			success: false,
			message: "Conversation mode is missing from the database. Apply migration 006_add_conversation_mode.sql in Supabase.",
		});
	}
	if (error.code === "LIMIT_FILE_SIZE") {
		return res.status(413).json({ success: false, message: "File must be 10 MB or smaller" });
	}
	if (error.code === "23505") {
		return res.status(409).json({ success: false, message: "A record with this identifier already exists" });
	}
	const clientStatus = Number.isInteger(error.statusCode)
		? error.statusCode
		: Number.isInteger(error.status) && error.status < 500 ? error.status : null;
	const statusCode = clientStatus ?? 500;
	const message = statusCode < 500 || error.expose === true
		? error.type === "entity.parse.failed" ? "Invalid JSON request body" : error.message
		: "Internal server error";

	return res.status(statusCode).json({ success: false, message });
}
