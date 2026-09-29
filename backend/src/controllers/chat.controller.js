import { CHAT_MODES, createUserConversation, sendConversationMessage, streamConversationMessage } from "../services/chat.service.js";
import { getAiSettings } from "../repositories/context.repository.js";
import { appConfig } from "../config/app.config.js";
import { performance } from "node:perf_hooks";
import { logPerformanceTrace, recordStage } from "../utils/performance.js";

export async function chatConfig(req, res, next) {
	try {
		const settings = await getAiSettings();
		return res.json({ success: true, data: { defaultMode: settings?.default_mode ?? "general" } });
	} catch (error) { return next(error); }
}

function readMessageContent(body = {}) {
	const content = typeof body.content === "string" ? body.content.trim() : "";
	return content || (typeof body.question === "string" ? body.question.trim() : "");
}

async function handleConversationMessage(req, res, next, regenerate = false) {
	if (!/^\d+$/.test(req.params.id)) {
		return res.status(400).json({ success: false, message: "Conversation ID is invalid" });
	}
	const content = readMessageContent(req.body);
	if (!regenerate && (!content || content.length > appConfig.chat.maxUserMessageChars)) {
		return res.status(400).json({ success: false, message: `Message is required and must be under ${appConfig.chat.maxUserMessageChars} characters` });
	}

	try {
		const data = await sendConversationMessage(req.user.id, req.params.id, content, { regenerate });
		return res.status(regenerate ? 200 : 201).json({ success: true, data });
	} catch (error) {
		return next(error);
	}
}

function writeSseEvent(res, event, data) {
	if (res.destroyed || res.writableEnded) return Promise.reject(new Error("Client disconnected"));
	const accepted = res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	if (accepted) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const onDrain = () => { cleanup(); resolve(); };
		const onClose = () => { cleanup(); reject(new Error("Client disconnected")); };
		const cleanup = () => { res.off("drain", onDrain); res.off("close", onClose); };
		res.once("drain", onDrain);
		res.once("close", onClose);
	});
}

export async function streamMessage(req, res, next) {
	if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ success: false, message: "Conversation ID is invalid" });
	const content = readMessageContent(req.body);
	if (!content || content.length > appConfig.chat.maxUserMessageChars) {
		return res.status(400).json({ success: false, message: `Message is required and must be under ${appConfig.chat.maxUserMessageChars} characters` });
	}
	const clientMessageId = req.body?.clientMessageId;
	if (typeof clientMessageId !== "string" || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(clientMessageId)) {
		return res.status(400).json({ success: false, message: "A valid clientMessageId is required" });
	}

	const controller = new AbortController();
	let completed = false;
	let timedOut = false;
	const timeout = setTimeout(() => {
		timedOut = true;
		const error = new Error("Gemini request timed out");
		error.code = "GEMINI_TIMEOUT";
		controller.abort(error);
	}, appConfig.ai.requestTimeoutMs);
	timeout.unref?.();
	const heartbeat = setInterval(() => {
		if (!res.destroyed && !res.writableEnded) res.write(": keep-alive\n\n");
	}, 15000);
	heartbeat.unref?.();
	res.on("close", () => {
		if (!completed && !controller.signal.aborted) {
			const error = new Error("Client disconnected");
			error.code = "CLIENT_DISCONNECTED";
			controller.abort(error);
		}
	});
	res.status(200);
	res.set({
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
		"X-Accel-Buffering": "no",
	});
	res.flushHeaders?.();

	try {
		const data = await streamConversationMessage(req.user.id, req.params.id, content, {
			clientMessageId,
			signal: controller.signal,
			trace: req.chatPerf,
			onReady: (payload) => writeSseEvent(res, "start", payload),
			onFirstToken: () => recordStage(req.chatPerf, "ttft", performance.now() - req.chatPerf.startedAt),
			onChunk: (text) => writeSseEvent(res, "chunk", { text }),
		});
		await writeSseEvent(res, "done", data);
		completed = true;
		res.end();
	} catch (error) {
		if (!res.destroyed && !res.writableEnded) {
			const statusCode = error.statusCode ?? 503;
			const message = timedOut
				? "AI response took too long. Please try again."
				: error.expose === true || statusCode < 500 || typeof error.message === "string"
					? error.message || "Chat could not be completed. Please try again."
					: "Chat could not be completed. Please try again.";
			await writeSseEvent(res, "error", {
				message,
				statusCode,
			});
			completed = true;
			res.end();
		}
		logPerformanceTrace(req.chatPerf, { failed: true, timed_out: timedOut });
	} finally {
		clearTimeout(timeout);
		clearInterval(heartbeat);
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
	if (!content || content.length > appConfig.chat.maxUserMessageChars) {
		return res.status(400).json({ success: false, message: `Message is required and must be under ${appConfig.chat.maxUserMessageChars} characters` });
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
