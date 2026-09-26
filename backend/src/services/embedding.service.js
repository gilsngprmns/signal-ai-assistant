import {
	createGeminiServiceError,
	GEMINI_EMBEDDING_DIMENSIONS,
	GEMINI_EMBEDDING_MODEL,
	getGeminiClient,
} from "../config/gemini.js";
import { withGeminiRetry } from "../utils/retryGemini.js";

export const EMBEDDING_DIMENSIONS = GEMINI_EMBEDDING_DIMENSIONS;
export const EMBEDDING_MODEL = GEMINI_EMBEDDING_MODEL;

function prepareEmbeddingText(text, kind) {
	return kind === "query"
		? `task: question answering | query: ${text}`
		: `title: none | text: ${text}`;
}

export async function generateEmbeddings(texts, { kind = "document" } = {}) {
	if (!Array.isArray(texts)) {
		throw new TypeError("Embedding input must be an array of text strings");
	}
	if (texts.some((text) => typeof text !== "string" || !text.trim())) {
		throw new TypeError("Embedding input text must not be empty");
	}
	if (!texts.length) return [];

	const client = getGeminiClient();
	console.info("Gemini embedding request", {
		model: EMBEDDING_MODEL,
		dimension: EMBEDDING_DIMENSIONS,
		inputCount: texts.length,
		kind,
	});
	const embeddings = [];
	try {
		for (let offset = 0; offset < texts.length; offset += 100) {
			const batch = texts.slice(offset, offset + 100);
			const response = await withGeminiRetry(() => client.models.embedContent({
				model: EMBEDDING_MODEL,
				contents: batch.map((text) => ({
					parts: [{ text: prepareEmbeddingText(text.trim(), kind) }],
				})),
				config: { outputDimensionality: EMBEDDING_DIMENSIONS },
			}));
			const values = response.embeddings?.map((embedding) => embedding.values);
			if (!values || values.length !== batch.length || values.some((vector) =>
				!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))
			)) {
				throw new Error("Gemini returned missing or invalid embedding vectors");
			}
			embeddings.push(...values);
		}
	} catch (error) {
		if (error.statusCode) throw error;
		throw createGeminiServiceError(error);
	}

	return embeddings;
}
