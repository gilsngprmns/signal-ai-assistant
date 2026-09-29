import jwt from "jsonwebtoken";
import { performance } from "node:perf_hooks";
import { findUserById } from "../repositories/user.repository.js";
import { createPerformanceTrace, recordStage } from "../utils/performance.js";

export default async function requireAuth(req, res, next) {
	const isChatMessage = req.method === "POST" && /\/messages(?:\/stream)?(?:\?|$)/.test(req.originalUrl);
	const authStarted = isChatMessage ? performance.now() : 0;
	if (isChatMessage) req.chatPerf = createPerformanceTrace(authStarted);
	const authorization = req.headers.authorization;
	const [scheme, token] = authorization?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return res.status(401).json({ success: false, message: "Authentication required" });
	}
	if (!process.env.JWT_SECRET) {
		return next(new Error("JWT_SECRET is not configured"));
	}

	let payload;
	try {
		payload = jwt.verify(token, process.env.JWT_SECRET);
	} catch {
		return res.status(401).json({ success: false, message: "Invalid or expired token" });
	}
	if (!payload || typeof payload === "string" || !payload.id) {
		return res.status(401).json({ success: false, message: "Invalid or expired token" });
	}
	try {
		const user = await findUserById(payload.id);
		if (isChatMessage) recordStage(req.chatPerf, "auth", performance.now() - authStarted);
		if (!user) return res.status(401).json({ success: false, message: "User account no longer exists" });
		if (user.status !== "active") return res.status(403).json({ success: false, message: "This account is suspended" });
		req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
		return next();
	} catch (error) {
		return next(error);
	}
}
