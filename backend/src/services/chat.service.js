import {
	addMessage,
	createConversation,
	findConversation,
	getRecentMessages,
	updateConversation,
	updateMessageContent,
} from "../repositories/conversation.repository.js";
import { generateChatResponse, generateChatResponseStream } from "./ai.service.js";
import { getAiSettings } from "../repositories/context.repository.js";
import { resolveRelevantContexts } from "./contextResolver.service.js";
import { appConfig } from "../config/app.config.js";
import { performance } from "node:perf_hooks";
import { createPerformanceTrace, logPerformanceTrace, measureStage, runNonBlockingTask } from "../utils/performance.js";

export const CHAT_MODES = ["general", "it", "music"];

function limitHistorySize(messages, maxCharacters = appConfig.chat.historyMaxChars) {
	let remaining = maxCharacters;
	const bounded = [];
	for (let index = messages.length - 1; index >= 0 && remaining > 0; index -= 1) {
		const message = messages[index];
		const content = message.content.slice(-remaining);
		bounded.unshift({ ...message, content });
		remaining -= content.length;
	}
	return bounded;
}

function makeConversationTitle(message) {
	const title = message.replace(/\s+/g, " ").trim();
	if (title.length <= 52) return title;
	return `${title.slice(0, 49).trimEnd()}...`;
}

function createChatError(message, statusCode) {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
}

export async function createUserConversation(userId, mode = "general") {
	if (!CHAT_MODES.includes(mode)) throw createChatError("Mode must be general, it, or music", 400);
	return createConversation(userId, "New Chat", mode);
}

export async function updateUserConversation(userId, conversationId, changes) {
	if (changes.mode !== undefined && !CHAT_MODES.includes(changes.mode)) {
		throw createChatError("Mode must be general, it, or music", 400);
	}
	if (changes.title !== undefined && (typeof changes.title !== "string" || !changes.title.trim() || changes.title.length > 120)) {
		throw createChatError("Title must be 1 to 120 characters", 400);
	}

	const conversation = await updateConversation(conversationId, userId, {
		title: changes.title?.trim(),
		mode: changes.mode,
	});
	if (!conversation) throw createChatError("Conversation not found", 404);
	return conversation;
}

async function prepareConversationMessage(userId, conversationId, text, { regenerate = false, clientMessageId, trace } = {}) {
	const conversation = await measureStage(trace, "load_conversation", () => findConversation(conversationId, userId));
	if (!conversation) throw createChatError("Conversation not found", 404);

	let userMessage;
	let history;
	let previousAssistant;
	let settings;
	let contexts;

	if (regenerate) {
		[settings, history] = await Promise.all([
			measureStage(trace, "load_settings", getAiSettings),
			measureStage(trace, "load_history", () => getRecentMessages(conversationId, appConfig.chat.historyMaxMessages)),
		]);
		const historyLimit = getHistoryLimit(settings);
		if (history.length > historyLimit) history = history.slice(-historyLimit);
		const lastUserIndex = history.findLastIndex((message) => message.role === "user");
		if (lastUserIndex < 0) throw createChatError("There is no user message to regenerate", 400);
		userMessage = history[lastUserIndex];
		previousAssistant = history.slice(lastUserIndex + 1).findLast((message) => message.role === "assistant");
		history = history.slice(0, lastUserIndex + 1);
		const currentMessage = userMessage.content;
		contexts = (await measureStage(trace, "resolve_context", () => resolveRelevantContexts(
			currentMessage,
			conversation.mode,
			appConfig.chat.maxActiveContexts,
		))).slice(0, getContextLimit(settings));
	} else {
		userMessage = await measureStage(trace, "save_user_message", () => addMessage(conversationId, "user", text, [], clientMessageId));
		if (!userMessage) throw createChatError("This message has already been accepted", 409);
		if (conversation.title === "New Chat" || conversation.title === "New conversation") {
			runNonBlockingTask("conversation-title", () => updateConversation(conversationId, userId, { title: makeConversationTitle(text) }));
		}
		[settings, history, contexts] = await Promise.all([
			measureStage(trace, "load_settings", getAiSettings),
			measureStage(trace, "load_history", () => getRecentMessages(conversationId, appConfig.chat.historyMaxMessages)),
			measureStage(trace, "resolve_context", () => resolveRelevantContexts(text, conversation.mode,
				appConfig.chat.maxActiveContexts)),
		]);
		const historyLimit = getHistoryLimit(settings);
		if (history.length > historyLimit) history = history.slice(-historyLimit);
		contexts = contexts.slice(0, getContextLimit(settings));
	}

	return { conversation, settings, history: limitHistorySize(history), contexts, userMessage, previousAssistant };
}

function getHistoryLimit(settings) {
	const limit = settings?.updated_by != null
		? settings.max_history_messages
		: appConfig.chat.historyMaxMessages;
	return Math.min(40, Math.max(1, limit ?? appConfig.chat.historyMaxMessages));
}

function getContextLimit(settings) {
	const limit = settings?.updated_by != null
		? settings.max_active_contexts
		: appConfig.chat.maxActiveContexts;
	return Math.min(3, Math.max(0, limit ?? appConfig.chat.maxActiveContexts));
}

export async function sendConversationMessage(userId, conversationId, text, { regenerate = false } = {}) {
	const prepared = await prepareConversationMessage(userId, conversationId, text, { regenerate });
	const responseText = await generateChatResponse({
		mode: CHAT_MODES.includes(prepared.conversation.mode) ? prepared.conversation.mode : "general",
		messages: prepared.history.map(({ role, content }) => ({ role, content })),
		contexts: prepared.contexts,
		settings: prepared.settings,
		userId,
		conversationId: prepared.conversation.id,
	});

	const assistantMessage = regenerate && prepared.previousAssistant
		? await updateMessageContent(prepared.previousAssistant.id, responseText)
		: await addMessage(conversationId, "assistant", responseText);

	return {
		userMessage: prepared.userMessage,
		assistantMessage: {
			...assistantMessage,
			sources: Array.isArray(assistantMessage.sources) ? assistantMessage.sources : [],
		},
		conversationId: prepared.conversation.id,
	};
}

export async function streamConversationMessage(userId, conversationId, text, {
	clientMessageId,
	signal,
	onChunk,
	onFirstToken,
	onReady,
	trace = createPerformanceTrace(),
} = {}) {
	const prepared = await prepareConversationMessage(userId, conversationId, text, { clientMessageId, trace });
	await onReady?.({ userMessage: prepared.userMessage, conversationId: prepared.conversation.id });
	let generation;
	try {
		generation = await generateChatResponseStream({
			mode: CHAT_MODES.includes(prepared.conversation.mode) ? prepared.conversation.mode : "general",
			messages: prepared.history.map(({ role, content }) => ({ role, content })),
			contexts: prepared.contexts,
			settings: prepared.settings,
			userId,
			conversationId: prepared.conversation.id,
			signal,
			onChunk,
			onFirstToken,
			trace,
		});
	} catch (error) { throw error; }

	const assistantMessage = await measureStage(trace, "save_assistant_message", () => addMessage(conversationId, "assistant", generation.text));
	const responsePathMs = Math.round(performance.now() - trace.startedAt);
	runNonBlockingTask("ai-usage-log", async () => {
		try { await measureStage(trace, "save_usage", () => generation.saveUsage()); }
		finally {
			logPerformanceTrace(trace, {
				ttft: generation.requestTtftMs,
				gemini_ttft: generation.ttftMs,
				gemini_total: generation.generationMs,
				response_path_total: responsePathMs,
			}, responsePathMs);
		}
	});
	return {
		userMessage: prepared.userMessage,
		assistantMessage: { ...assistantMessage, sources: [] },
		conversationId: prepared.conversation.id,
	};
}
