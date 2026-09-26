import api from "./api.js";

export async function getConversations() {
	const response = await api.get("/conversations");
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
