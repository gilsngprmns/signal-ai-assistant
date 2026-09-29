const windows = new Map();
let requestCount = 0;

export function createRateLimiter({ windowMs, max, message }) {
	return function rateLimiter(req, res, next) {
		const now = Date.now();
		const key = String(req.user?.id ?? req.ip ?? req.socket.remoteAddress ?? "unknown");
		let record = windows.get(key);
		if (!record || record.resetAt <= now) {
			record = { count: 0, resetAt: now + windowMs };
			windows.set(key, record);
		}
		record.count += 1;
		const remaining = Math.max(0, max - record.count);
		res.setHeader("RateLimit-Limit", max);
		res.setHeader("RateLimit-Remaining", remaining);
		if (record.count > max) {
			const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
			res.setHeader("Retry-After", retryAfter);
			return res.status(429).json({ success: false, message });
		}
		requestCount += 1;
		if (requestCount % 500 === 0) {
			for (const [bucketKey, bucket] of windows) if (bucket.resetAt <= now) windows.delete(bucketKey);
		}
		return next();
	};
}