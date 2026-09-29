import { listActiveContexts } from "../repositories/context.repository.js";

function matchesKeyword(text, keyword) {
	const normalized = keyword.trim().toLowerCase();
	if (!normalized) return false;
	if (normalized.length <= 2) {
		const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(text);
	}
	return text.includes(normalized);
}

export async function resolveRelevantContexts(message, mode = "general", maxContexts = 3) {
	if (typeof message !== "string" || !message.trim() || maxContexts <= 0) return [];
	const normalizedMessage = message.normalize("NFKC").toLowerCase().slice(0, 20000);
	const contexts = await listActiveContexts();
	return contexts.map((context) => {
		const matchedKeywords = [...new Set((context.keywords ?? []).filter((keyword) => matchesKeyword(normalizedMessage, keyword)))];
		const modeMatch = (mode === "it" && /it|technology|network|software/i.test(context.category)) ||
			(mode === "music" && /music|audio/i.test(context.category));
		return { ...context, matchedKeywords, score: matchedKeywords.length + (modeMatch && matchedKeywords.length ? 0.25 : 0) };
	})
		.filter((context) => context.matchedKeywords.length > 0)
		.sort((left, right) => right.score - left.score || right.priority - left.priority || left.id - right.id)
		.slice(0, Math.min(3, Math.max(0, maxContexts)))
		.map(({ id, name, category, context_prompt, matchedKeywords }) => ({
			id,
			name,
			category,
			contextPrompt: context_prompt.slice(0, 2500),
			matchedKeywords,
		}));
}