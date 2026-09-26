export default function errorMiddleware(error, req, res, next) {
	if (res.headersSent) {
		return next(error);
	}

	console.error("API request failed:", error);
	if (error.code === "42703" && (error.column === "mode" || /column ["']mode["']/.test(error.message))) {
		return res.status(503).json({
			success: false,
			message: "Conversation mode is missing from the database. Apply migration 006_add_conversation_mode.sql in Supabase.",
		});
	}
	if (error.code === "LIMIT_FILE_SIZE") {
		return res.status(413).json({ success: false, message: "File must be 10 MB or smaller" });
	}
	if (error.name === "MulterError") {
		return res.status(400).json({ success: false, message: "The uploaded file could not be accepted" });
	}
	const clientStatus = Number.isInteger(error.statusCode)
		? error.statusCode
		: Number.isInteger(error.status) && error.status < 500 ? error.status : null;
	const statusCode = clientStatus ?? 500;
	const message = statusCode < 500
		? error.type === "entity.parse.failed" ? "Invalid JSON request body" : error.message
		: "Internal server error";

	return res.status(statusCode).json({ success: false, message });
}
