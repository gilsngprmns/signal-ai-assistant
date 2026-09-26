import pool from "../config/database.js";
import { GEMINI_EMBEDDING_DIMENSIONS } from "../config/gemini.js";

function assertEmbeddingDimension(embedding, label) {
	if (!Array.isArray(embedding) || embedding.length !== GEMINI_EMBEDDING_DIMENSIONS ||
		embedding.some((value) => !Number.isFinite(value))) {
		const actual = Array.isArray(embedding) ? embedding.length : "invalid";
		throw new Error(`${label} embedding dimension mismatch: expected ${GEMINI_EMBEDDING_DIMENSIONS}, received ${actual}`);
	}
}

export async function replaceDocumentChunks(documentId, chunks) {
	if (!Array.isArray(chunks)) throw new TypeError("Document chunks must be an array");
	for (const chunk of chunks) assertEmbeddingDimension(chunk.embedding, "Document");
	console.info("Storing document vectors", { documentId, chunks: chunks.length, dimension: GEMINI_EMBEDDING_DIMENSIONS });

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await client.query("DELETE FROM document_chunks WHERE document_id = $1", [documentId]);
		for (const chunk of chunks) {
			const vector = `[${chunk.embedding.join(",")}]`;
			await client.query(
				`INSERT INTO document_chunks (document_id, chunk_index, content, page_number, embedding)
				 VALUES ($1, $2, $3, $4, $5::vector)`,
				[documentId, chunk.index, chunk.content, chunk.pageNumber, vector]
			);
		}
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function searchRelevantChunks(userId, embedding, documentIds = [], limit = 5) {
	assertEmbeddingDimension(embedding, "Question");
	console.info("Vector search", { topK: limit, dimension: embedding.length });
	const vector = `[${embedding.join(",")}]`;
	const filterByDocuments = documentIds.length > 0;
	const result = await pool.query(
		`SELECT dc.document_id, d.original_name AS document_name, dc.page_number,
						dc.chunk_index, dc.content, dc.embedding <=> $1::vector AS distance
		 FROM document_chunks dc
		 JOIN documents d ON d.id = dc.document_id
		 WHERE d.user_id = $2
			 AND dc.embedding IS NOT NULL
			 AND ($3::boolean = false OR d.id = ANY($4::bigint[]))
		 ORDER BY dc.embedding <=> $1::vector
		 LIMIT $5`,
		[vector, userId, filterByDocuments, documentIds, limit]
	);
	return result.rows;
}
