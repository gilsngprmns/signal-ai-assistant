import {
	addMessage,
	createConversation,
	findConversation,
	getRecentMessages,
	updateConversation,
	updateMessageContent,
} from "../repositories/conversation.repository.js";
import { generateChatResponse } from "./ai.service.js";

export const CHAT_MODES = ["general", "it", "music"];
const CHAT_CONTEXT_LIMIT = 20;

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

export async function sendConversationMessage(userId, conversationId, text, { regenerate = false } = {}) {
	const conversation = await findConversation(conversationId, userId);
	if (!conversation) throw createChatError("Conversation not found", 404);

	let userMessage;
	let history;
	let previousAssistant;

	if (regenerate) {
		history = await getRecentMessages(conversationId, CHAT_CONTEXT_LIMIT);
		const lastUserIndex = history.findLastIndex((message) => message.role === "user");
		if (lastUserIndex < 0) throw createChatError("There is no user message to regenerate", 400);
		userMessage = history[lastUserIndex];
		previousAssistant = history.slice(lastUserIndex + 1).findLast((message) => message.role === "assistant");
		history = history.slice(0, lastUserIndex + 1);
	} else {
		userMessage = await addMessage(conversationId, "user", text);
		if (conversation.title === "New Chat" || conversation.title === "New conversation") {
			await updateConversation(conversationId, userId, { title: makeConversationTitle(text) });
		}
		history = await getRecentMessages(conversationId, CHAT_CONTEXT_LIMIT);
	}

	const responseText = await generateChatResponse({
		mode: CHAT_MODES.includes(conversation.mode) ? conversation.mode : "general",
		messages: history.map(({ role, content }) => ({ role, content })),
	});

	const assistantMessage = regenerate && previousAssistant
		? await updateMessageContent(previousAssistant.id, responseText)
		: await addMessage(conversationId, "assistant", responseText);

	return {
		userMessage,
		assistantMessage: {
			...assistantMessage,
			sources: Array.isArray(assistantMessage.sources) ? assistantMessage.sources : [],
		},
		conversationId: conversation.id,
	};
}
