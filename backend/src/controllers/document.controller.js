import { getDocument, getDocumentFile, getDocuments, removeDocument, uploadDocument } from "../services/document.service.js";

export async function create(req, res, next) {
	if (!req.file) {
		return res.status(400).json({ success: false, message: "A document file is required" });
	}
	try {
		const document = await uploadDocument(req.user.id, req.file);
		return res.status(201).json({ success: true, message: "Document uploaded", data: document });
	} catch (error) {
		return next(error);
	}
}

export async function list(req, res, next) {
	try {
		const documents = await getDocuments(req.user.id);
		return res.json({ success: true, data: documents });
	} catch (error) {
		return next(error);
	}
}

export async function getById(req, res, next) {
	if (!/^\d+$/.test(req.params.id)) {
		return res.status(400).json({ success: false, message: "Document ID is invalid" });
	}
	try {
		const document = await getDocument(req.user.id, req.params.id);
		if (!document) return res.status(404).json({ success: false, message: "Document not found" });
		return res.json({ success: true, data: document });
	} catch (error) {
		return next(error);
	}
}

export async function openFile(req, res, next) {
	if (!/^\d+$/.test(req.params.id)) {
		return res.status(400).json({ success: false, message: "Document ID is invalid" });
	}
	try {
		const file = await getDocumentFile(req.user.id, req.params.id);
		if (!file) return res.status(404).json({ success: false, message: "Document not found" });
		const filename = encodeURIComponent(file.name).replace(/[!'()*]/g, (character) =>
			`%${character.charCodeAt(0).toString(16).toUpperCase()}`
		);
		res.setHeader("Content-Type", file.fileType);
		res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${filename}`);
		res.setHeader("X-Content-Type-Options", "nosniff");
		return res.sendFile(file.path, (error) => {
			if (error && !res.headersSent) next(error);
		});
	} catch (error) {
		return next(error);
	}
}

export async function remove(req, res, next) {
	if (!/^\d+$/.test(req.params.id)) {
		return res.status(400).json({ success: false, message: "Document ID is invalid" });
	}
	try {
		const deleted = await removeDocument(req.user.id, req.params.id);
		if (!deleted) return res.status(404).json({ success: false, message: "Document not found" });
		return res.json({ success: true, message: "Document deleted", data: {} });
	} catch (error) {
		return next(error);
	}
}
