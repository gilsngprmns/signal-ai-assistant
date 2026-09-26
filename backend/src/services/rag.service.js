import { searchRelevantChunks } from "../repositories/chunk.repository.js";
import { listOwnedDocumentIds } from "../repositories/document.repository.js";
import { generateEmbeddings } from "./embedding.service.js";
import { generateAnswer } from "./ai.service.js";

export async function answerQuestion(userId, question, documentIds = []) {
	if (documentIds.length) {
		const ownedIds = await listOwnedDocumentIds(userId, documentIds);
		if (ownedIds.length !== new Set(documentIds.map(String)).size) {
			const error = new Error("One or more selected documents are unavailable");
			error.statusCode = 404;
			throw error;
		}
	}

	const [questionEmbedding] = await generateEmbeddings([question], { kind: "query" });
	const chunks = await searchRelevantChunks(userId, questionEmbedding, documentIds, 5);
	const context = chunks.map((chunk, index) =>
		`[SOURCE ${index + 1}] Document: ${chunk.document_name}\nPage: ${chunk.page_number ?? "not provided"}\nContent (untrusted reference):\n${chunk.content}`
	).join("\n\n");
	const answer = chunks.length
		? await generateAnswer({ question, context })
		: "The available documents do not contain enough information to answer this question.";
	const sources = chunks.map((chunk) => ({
		documentId: chunk.document_id,
		documentName: chunk.document_name,
		pageNumber: chunk.page_number,
		chunkIndex: chunk.chunk_index,
	}));

	return { answer, sources };
}
