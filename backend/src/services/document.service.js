import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDocument, deleteDocument, findDocumentById, listDocumentsByUser, updateDocumentStatus } from "../repositories/document.repository.js";
import { replaceDocumentChunks } from "../repositories/chunk.repository.js";
import { EMBEDDING_DIMENSIONS, generateEmbeddings } from "./embedding.service.js";
import { assertGeminiConfigured } from "../config/gemini.js";
import chunkText from "../utils/chunkText.js";
import extractText from "../utils/extractText.js";

const uploadDirectory = fileURLToPath(new URL("../../uploads/", import.meta.url));

export async function uploadDocument(userId, file) {
	try {
		assertGeminiConfigured();
	} catch (error) {
		await unlink(file.path).catch((cleanupError) => {
			if (cleanupError.code !== "ENOENT") console.error("Could not remove rejected upload:", cleanupError);
		});
		throw error;
	}

	let document;
	try {
		document = await createDocument({
			userId,
			originalName: path.basename(file.originalname),
			storedName: file.filename,
			fileType: file.mimetype,
			fileSize: file.size,
		});
	} catch (error) {
		await unlink(file.path).catch((cleanupError) => {
			if (cleanupError.code !== "ENOENT") console.error("Could not remove unregistered upload:", cleanupError);
		});
		throw error;
	}

	processDocument(document.id, file.path, document.file_type).catch(async (error) => {
		console.error("Document processing failed:", error);
		try {
			await updateDocumentStatus(document.id, "failed");
		} catch (statusError) {
			console.error("Could not update failed document status:", statusError);
		}
	});

	return document;
}

async function processDocument(documentId, filePath, fileType) {
	await updateDocumentStatus(documentId, "processing");
	const text = await extractText(filePath, fileType);
	const chunks = chunkText(text);
	const embeddings = await generateEmbeddings(chunks.map((chunk) => chunk.content));
	if (embeddings.some((embedding) => embedding.length !== EMBEDDING_DIMENSIONS)) {
		throw new Error(`Embedding dimensions do not match vector(${EMBEDDING_DIMENSIONS})`);
	}
	await replaceDocumentChunks(
		documentId,
		chunks.map((chunk, index) => ({ ...chunk, embedding: embeddings[index] }))
	);
	await updateDocumentStatus(documentId, "ready");
}

export function getDocuments(userId) {
	return listDocumentsByUser(userId);
}

export async function getDocument(userId, documentId) {
	return findDocumentById(documentId, userId);
}

export async function getDocumentFile(userId, documentId) {
	const document = await findDocumentById(documentId, userId);
	if (!document) return null;
	return {
		path: path.join(uploadDirectory, path.basename(document.stored_name)),
		name: document.original_name,
		fileType: document.file_type,
	};
}

export async function removeDocument(userId, documentId) {
	const document = await deleteDocument(documentId, userId);
	if (!document) return false;

	const filePath = path.join(uploadDirectory, path.basename(document.stored_name));
	try {
		await unlink(filePath);
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	return true;
}
