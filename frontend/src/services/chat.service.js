import api from "./api.js";

export async function getConversations() {
	const response = await api.get("/conversations");
	return response.data.data;
}

export async function getChatConfig() {
	const response = await api.get("/chat/config");
	return response.data.data;
}

export async function getConversation(id) {
	const response = await api.get(`/conversations/${id}`);
	return response.data.data;
}

export async function createConversation(mode = "general") {
	const response = await api.post("/conversations", { mode });
	return response.data.data;
}

export async function updateConversation(id, changes) {
	const response = await api.patch(`/conversations/${id}`, changes);
	return response.data.data;
}

export async function sendConversationMessage(id, content) {
	const response = await api.post(`/conversations/${id}/messages`, { content });
	return response.data.data;
}

export async function streamConversationMessage(id, content, { clientMessageId, signal, onStart, onChunk } = {}) {
	const token = localStorage.getItem("token");
	const response = await fetch(api.getUri({ url: `/conversations/${id}/messages/stream` }), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "text/event-stream",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({ content, clientMessageId }),
		signal,
	});
	if (!response.ok) {
		const body = await response.text();
		let message = "Your message could not be sent. Try again.";
		try { message = JSON.parse(body).message || message; } catch {}
		throw new Error(message);
	}
	if (!response.body) throw new Error("Streaming is not available in this browser");

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let result;
	function dispatch(block) {
		let event = "message";
		const data = [];
		for (const line of block.split(/\r?\n/)) {
			if (line.startsWith("event:")) event = line.slice(6).trim();
			else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
		}
		if (!data.length) return;
		const payload = JSON.parse(data.join("\n"));
		if (event === "start") onStart?.(payload);
		if (event === "chunk") onChunk?.(payload.text || "");
		if (event === "done") result = payload;
		if (event === "error") throw new Error(payload.message || "AI service is temporarily unavailable");
	}

	try {
		while (true) {
			const { value, done } = await reader.read();
			buffer += decoder.decode(value, { stream: !done });
			const blocks = buffer.split(/\r?\n\r?\n/);
			buffer = blocks.pop() || "";
			for (const block of blocks) dispatch(block);
			if (done) break;
		}
		if (buffer.trim()) dispatch(buffer);
	} finally {
		reader.releaseLock();
	}
	if (!result) throw new Error("The AI stream ended before a response was completed");
	return result;
}

export async function regenerateMessage(id) {
	const response = await api.post(`/conversations/${id}/messages/regenerate`);
	return response.data.data;
}

export async function getConversationMessages(id) {
	const response = await api.get(`/conversations/${id}/messages`);
	return response.data.data;
}

export async function deleteConversation(id) {
	const response = await api.delete(`/conversations/${id}`);
	return response.data;
}
