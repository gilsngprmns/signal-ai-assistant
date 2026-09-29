export function requireAdmin(req, res, next) {
	if (req.user?.role !== "admin") {
		return res.status(403).json({ success: false, message: "Administrator access required" });
	}
	return next();
}

export function requireUser(req, res, next) {
	if (req.user?.role !== "user") {
		return res.status(403).json({ success: false, message: "User account access required" });
	}
	return next();
}