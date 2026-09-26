import { readFile } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

function normalizeText(text) {
	return text
		.replace(/\0/g, "")
		.replace(/\r\n?/g, "\n")
		.replace(/[\t\f\v ]+/g, " ")
		.replace(/ *\n */g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export default async function extractText(filePath, fileType) {
	const extension = path.extname(filePath).toLowerCase();
	let text;

	try {
		if (extension === ".txt" || fileType === "text/plain") {
			text = await readFile(filePath, "utf8");
		} else if (extension === ".docx") {
			const result = await mammoth.extractRawText({ path: filePath });
			text = result.value;
		} else if (extension === ".pdf") {
			const parser = new PDFParse({ data: new Uint8Array(await readFile(filePath)) });
			try {
				const result = await parser.getText();
				text = result.text;
			} finally {
				await parser.destroy();
			}
		} else {
			const error = new Error("Unsupported document format");
			error.statusCode = 400;
			throw error;
		}
	} catch (error) {
		if (error.statusCode) throw error;
		const parsingError = new Error("The uploaded document could not be parsed");
		parsingError.cause = error;
		throw parsingError;
	}

	const normalized = normalizeText(text ?? "");
	if (!normalized) {
		const error = new Error("The document contains no extractable text");
		error.statusCode = 422;
		throw error;
	}
	return normalized;
}
