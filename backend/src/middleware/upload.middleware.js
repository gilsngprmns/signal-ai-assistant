import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const uploadDirectory = fileURLToPath(new URL("../../uploads/", import.meta.url));
mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = new Map([
	[".pdf", "application/pdf"],
	[".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
	[".txt", "text/plain"],
]);

const storage = multer.diskStorage({
	destination: uploadDirectory,
	filename(req, file, callback) {
		const extension = path.extname(file.originalname).toLowerCase();
		callback(null, `${randomUUID()}${extension}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 10 * 1024 * 1024, files: 1 },
	fileFilter(req, file, callback) {
		const extension = path.extname(file.originalname).toLowerCase();
		if (allowedTypes.get(extension) !== file.mimetype) {
			const error = new Error("Only PDF, DOCX, and TXT files are supported");
			error.statusCode = 400;
			return callback(error);
		}
		return callback(null, true);
	},
});

export default upload;
