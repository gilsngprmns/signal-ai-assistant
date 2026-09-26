const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

export async function withGeminiRetry(operation, {
	maxAttempts = 4,
	baseDelayMs = 500,
	maxDelayMs = 4000,
	jitterMs = 250,
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
			if (!RETRYABLE_STATUSES.has(status) || attempt === maxAttempts) {
				throw error;
			}

			const backoffMs = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
			const jitter = Math.floor(Math.max(0, Math.min(1, random())) * jitterMs);
			const delayMs = backoffMs + jitter;
			console.warn(`Gemini retry attempt ${attempt + 1}/${maxAttempts} after HTTP ${status}; waiting ${delayMs}ms`);
			await sleep(delayMs);
		}
	}
}
