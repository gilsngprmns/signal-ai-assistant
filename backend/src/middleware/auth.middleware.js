import jwt from "jsonwebtoken";

export default function requireAuth(req, res, next) {
	const authorization = req.headers.authorization;
	const [scheme, token] = authorization?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return res.status(401).json({ success: false, message: "Authentication required" });
	}
	if (!process.env.JWT_SECRET) {
		return next(new Error("JWT_SECRET is not configured"));
	}

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET);
		if (!payload || typeof payload === "string" || !payload.id) {
			return res.status(401).json({ success: false, message: "Invalid or expired token" });
		}
		req.user = { id: payload.id, email: payload.email };
		return next();
	} catch {
		return res.status(401).json({ success: false, message: "Invalid or expired token" });
	}
}
