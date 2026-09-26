import { CHAT_MODES, createUserConversation, sendConversationMessage } from "../services/chat.service.js";

function readMessageContent(body = {}) {
	const content = typeof body.content === "string" ? body.content.trim() : "";
	return content || (typeof body.question === "string" ? body.question.trim() : "");
}

async function handleConversationMessage(req, res, next, regenerate = false) {
	if (!/^\d+$/.test(req.params.id)) {
		return res.status(400).json({ success: false, message: "Conversation ID is invalid" });
	}
	const content = readMessageContent(req.body);
	if (!regenerate && (!content || content.length > 20000)) {
		return res.status(400).json({ success: false, message: "Message is required and must be under 20000 characters" });
	}

	try {
		const data = await sendConversationMessage(req.user.id, req.params.id, content, { regenerate });
		return res.status(regenerate ? 200 : 201).json({ success: true, data });
	} catch (error) {
		return next(error);
	}
}

export function sendMessage(req, res, next) {
	return handleConversationMessage(req, res, next);
}

export function regenerateMessage(req, res, next) {
	return handleConversationMessage(req, res, next, true);
}

export async function chat(req, res, next) {
	const content = readMessageContent(req.body);
	if (!content || content.length > 20000) {
		return res.status(400).json({ success: false, message: "Message is required and must be under 20000 characters" });
	}
	if (req.body.mode !== undefined && !CHAT_MODES.includes(req.body.mode)) {
		return res.status(400).json({ success: false, message: "Mode must be general, it, or music" });
	}

	try {
		let conversationId = req.body.conversationId;
		if (conversationId !== undefined && !/^\d+$/.test(String(conversationId))) {
			return res.status(400).json({ success: false, message: "Conversation ID is invalid" });
		}
		if (conversationId === undefined) {
			const conversation = await createUserConversation(req.user.id, req.body.mode ?? "general");
			conversationId = conversation.id;
		}
		const data = await sendConversationMessage(req.user.id, conversationId, content);
		return res.status(201).json({ success: true, data });
	} catch (error) {
		return next(error);
	}
}
