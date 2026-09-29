export async function create(req, res) {
	return res.status(410).json({ success: false, message: "Legacy document upload is disabled in this backend build." });
}

export async function list(req, res) {
	return res.status(410).json({ success: false, message: "Legacy document listing is disabled in this backend build." });
}

export async function getById(req, res) {
	return res.status(410).json({ success: false, message: "Legacy document retrieval is disabled in this backend build." });
}

export async function openFile(req, res) {
	return res.status(410).json({ success: false, message: "Legacy document file access is disabled in this backend build." });
}

export async function remove(req, res) {
	return res.status(410).json({ success: false, message: "Legacy document deletion is disabled in this backend build." });
}
