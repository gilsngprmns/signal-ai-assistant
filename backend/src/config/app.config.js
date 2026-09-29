import "dotenv/config";

function readInteger(name, fallback, minimum, maximum) {
	const value = Number.parseInt(process.env[name] ?? "", 10);
	return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

function readNumber(name, fallback, minimum, maximum) {
	const value = Number.parseFloat(process.env[name] ?? "");
	return Number.isFinite(value) && value >= minimum && value <= maximum ? value : fallback;
}

export const appConfig = Object.freeze({
	nodeEnv: process.env.NODE_ENV || "development",
	perfLogging: process.env.ENABLE_PERF_LOGGING === "true",
	database: Object.freeze({
		poolMax: readInteger("DB_POOL_MAX", 10, 1, 50),
		idleTimeoutMs: readInteger("DB_IDLE_TIMEOUT_MS", 30000, 1000, 300000),
		connectionTimeoutMs: readInteger("DB_CONNECTION_TIMEOUT_MS", 5000, 250, 60000),
		queryTimeoutMs: readInteger("DATABASE_QUERY_TIMEOUT_MS", 5000, 250, 120000),
	}),
	ai: Object.freeze({
		model: process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest",
		maxRetries: readInteger("GEMINI_MAX_RETRIES", 2, 0, 5),
		retryBaseMs: readInteger("GEMINI_RETRY_BASE_MS", 500, 50, 5000),
		requestTimeoutMs: readInteger("GEMINI_REQUEST_TIMEOUT_MS", 30000, 1000, 120000),
		maxOutputTokens: readInteger("AI_MAX_OUTPUT_TOKENS", 1200, 64, 8192),
		temperature: readNumber("AI_TEMPERATURE", 0.65, 0, 2),
	}),
	chat: Object.freeze({
		historyMaxMessages: readInteger("CHAT_HISTORY_MAX_MESSAGES", 12, 1, 40),
		historyMaxChars: readInteger("CHAT_HISTORY_MAX_CHARS", 24000, 1000, 100000),
		maxUserMessageChars: readInteger("MAX_USER_MESSAGE_CHARS", 12000, 100, 20000),
		maxActiveContexts: readInteger("MAX_ACTIVE_CONTEXTS", 3, 0, 3),
	}),
	cache: Object.freeze({
		contextTtlMs: readInteger("CONTEXT_CACHE_TTL_MS", 60000, 1000, 600000),
		settingsTtlMs: readInteger("AI_SETTINGS_CACHE_TTL_MS", 30000, 1000, 600000),
	}),
});