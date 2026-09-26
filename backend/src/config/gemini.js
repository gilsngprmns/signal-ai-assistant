import { GoogleGenAI } from "@google/genai";

export const GEMINI_GENERATION_MODEL = "gemini-3.8-flash";
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
export const GEMINI_EMBEDDING_DIMENSIONS = 768;

let client;

export function isGeminiConfigured() {
	const apiKey = process.env.GEMINI_API_KEY?.trim();
	return Boolean(apiKey && !apiKey.toLowerCase().includes("your_gemini_api_key"));
}

export function assertGeminiConfigured() {
	if (isGeminiConfigured()) return;

	const error = new Error("AI features are unavailable. Set GEMINI_API_KEY in backend/.env and restart the backend.");
	error.statusCode = 503;
	throw error;
}

export function getGeminiClient() {
	assertGeminiConfigured();
	client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
	return client;
}

export function createGeminiServiceError(error) {
	const status = Number(error?.status);
	const serviceError = new Error(
		status === 401 || status === 403
			? "Gemini API authentication failed. Check the configured key and its permissions."
			: status === 429
				? "Gemini quota or rate limit reached. Check the limits for your Google AI Studio project."
				: status === 404
					? "The configured Gemini model is unavailable."
					: status === 503 || status === 500 || status === 502 || status === 504
						? "AI service is temporarily unavailable. Please try again."
						: "Gemini could not complete the AI request. Check the backend log for details."
	);
	serviceError.statusCode = status === 429 ? 429 : status === 401 || status === 403 || status === 404 || status === 503 || status === 500 || status === 502 || status === 504 ? 503 : 502;
	console.error("Gemini request failed:", {
		status: Number.isFinite(status) ? status : undefined,
		code: error?.code,
		name: error?.name,
	});
	return serviceError;
}
