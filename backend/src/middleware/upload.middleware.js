export default function disabledUploadMiddleware(req, res, next) {
	return res.status(410).json({ success: false, message: "Legacy document upload is disabled in this backend build." });
}
