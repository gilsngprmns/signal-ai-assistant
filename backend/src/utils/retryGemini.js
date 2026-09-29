import { appConfig } from "../config/app.config.js";

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

function retryAfterMilliseconds(error) {
	const raw = error?.headers?.get?.("retry-after") ?? error?.headers?.["retry-after"] ?? error?.response?.headers?.["retry-after"];
	if (!raw) return null;
	const seconds = Number(raw);
	if (Number.isFinite(seconds) && seconds >= 0) return Math.min(5000, seconds * 1000);
	const dateDelay = Date.parse(raw) - Date.now();
	return Number.isFinite(dateDelay) && dateDelay > 0 ? Math.min(5000, dateDelay) : null;
}

export function isRetryableGeminiError(error) {
	return RETRYABLE_STATUSES.has(Number(error?.status ?? error?.statusCode));
}

export function getGeminiRetryDelay(error, attempt, { baseDelayMs = appConfig.ai.retryBaseMs, maxDelayMs = 2500, jitterMs = 200, random = Math.random } = {}) {
	const providerDelay = retryAfterMilliseconds(error);
	if (providerDelay !== null) return providerDelay;
	const backoffMs = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
	const jitter = Math.floor(Math.max(0, Math.min(1, random())) * jitterMs);
	return backoffMs + jitter;
}

export async function withGeminiRetry(operation, {
	maxAttempts = appConfig.ai.maxRetries + 1,
	baseDelayMs = appConfig.ai.retryBaseMs,
	maxDelayMs = 2500,
	jitterMs = 200,
	sleep = wait,
	random = Math.random,
} = {}) {
	if (typeof operation !== "function") {
		throw new TypeError("Gemini retry operation must be a function");
	}
	if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
		throw new RangeError("maxAttempts must be a positive integer");
	}

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			return await operation();
		} catch (error) {
			const status = Number(error?.status ?? error?.statusCode);
			if (!isRetryableGeminiError(error) || attempt === maxAttempts) {
				throw error;
			}

			const delayMs = getGeminiRetryDelay(error, attempt, { baseDelayMs, maxDelayMs, jitterMs, random });
			if (appConfig.nodeEnv !== "production") console.warn(`Gemini retry attempt ${attempt + 1}/${maxAttempts} after HTTP ${status}; waiting ${delayMs}ms`);
			await sleep(delayMs);
		}
	}
}
