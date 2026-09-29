import {
	countAdminUsers,
	deleteAdminConversation,
	deleteAdminUser,
	findAdminUser,
	listAdminActivity,
	listAdminConversations,
	listAdminUsers,
	updateAdminUser,
	writeAdminActivity,
} from "../repositories/admin.repository.js";
import { getDashboardAnalytics, getUsageAnalytics } from "../repositories/analytics.repository.js";
import { getAiSettings, updateAiSettings } from "../repositories/context.repository.js";

function serviceError(message, statusCode = 400) {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
}

function readPage(input = {}) {
	const page = Math.max(1, Number.parseInt(input.page, 10) || 1);
	const limit = Math.min(100, Math.max(1, Number.parseInt(input.limit, 10) || 50));
	return { page, limit, offset: (page - 1) * limit };
}

export async function getAdminDashboard(geminiConfigured) {
	return getDashboardAnalytics({ geminiStatus: geminiConfigured ? "configured" : "not_configured" });
}

export async function getUsers(filters = {}) {
	const { page, limit, offset } = readPage(filters);
	const search = typeof filters.search === "string" ? filters.search.trim().slice(0, 120) : "";
	const role = ["user", "admin"].includes(filters.role) ? filters.role : "";
	const status = ["active", "suspended"].includes(filters.status) ? filters.status : "";
	const [users, total] = await Promise.all([
		listAdminUsers({ search, role, status, limit, offset }),
		countAdminUsers({ search, role, status }),
	]);
	return { users, total, page, limit };
}

export async function getUserDetails(id) {
	const user = await findAdminUser(id);
	if (!user) throw serviceError("User not found", 404);
	return user;
}

export async function changeUser(admin, id, changes) {
	if (!["user", "admin"].includes(changes.role) && changes.role !== undefined) {
		throw serviceError("Role must be user or admin");
	}
	if (!["active", "suspended"].includes(changes.status) && changes.status !== undefined) {
		throw serviceError("Status must be active or suspended");
	}
	if (changes.role === undefined && changes.status === undefined) {
		throw serviceError("Provide a role or status to update");
	}
	if (String(admin.id) === String(id) && (changes.status === "suspended" || changes.role === "user")) {
		throw serviceError("You cannot suspend or demote your own account", 400);
	}
	const before = await findAdminUser(id);
	if (!before) throw serviceError("User not found", 404);
	const updated = await updateAdminUser(id, changes);
	const changesList = [];
	if (changes.role && changes.role !== before.role) changesList.push(`role from ${before.role} to ${changes.role}`);
	if (changes.status && changes.status !== before.status) changesList.push(`status from ${before.status} to ${changes.status}`);
	if (changesList.length) {
		await writeAdminActivity({
			adminId: admin.id,
			action: changes.status === "suspended" ? "USER_SUSPENDED" : changes.status === "active" ? "USER_ACTIVATED" : "USER_ROLE_CHANGED",
			targetType: "user",
			targetId: id,
			description: `${admin.name} changed user #${id} ${changesList.join(" and ")}.`,
			metadata: { before: { role: before.role, status: before.status }, after: { role: updated.role, status: updated.status } },
		});
	}
	return updated;
}

export async function removeUser(admin, id) {
	if (String(admin.id) === String(id)) throw serviceError("You cannot delete your own account", 400);
	const existing = await findAdminUser(id);
	if (!existing) throw serviceError("User not found", 404);
	await writeAdminActivity({ adminId: admin.id, action: "USER_DELETED", targetType: "user", targetId: id,
		description: `${admin.name} deleted user #${id} (${existing.email}).` });
	return deleteAdminUser(id);
}

export async function getConversations(filters = {}) {
	const { page, limit, offset } = readPage(filters);
	return listAdminConversations({
		search: typeof filters.search === "string" ? filters.search.trim().slice(0, 120) : "",
		userId: /^\d+$/.test(String(filters.userId ?? "")) ? String(filters.userId) : null,
		mode: ["general", "it", "music"].includes(filters.mode) ? filters.mode : "",
		limit, offset,
	});
}

export async function removeConversation(admin, id) {
	const conversation = await deleteAdminConversation(id);
	if (!conversation) throw serviceError("Conversation not found", 404);
	await writeAdminActivity({ adminId: admin.id, action: "CONVERSATION_DELETED", targetType: "conversation", targetId: id,
		description: `${admin.name} deleted conversation #${id} (${conversation.title}).` });
	return conversation;
}

export async function getUsage(filters = {}) {
	const { page, limit, offset } = readPage(filters);
	const days = Math.min(365, Math.max(1, Number.parseInt(filters.days, 10) || 30));
	return getUsageAnalytics({ days, limit, offset });
}

export async function getActivity(filters = {}) {
	const { page, limit, offset } = readPage(filters);
	const logs = await listAdminActivity({ limit, offset });
	return { logs, page, limit };
}

export async function getSettings() {
	const { updated_by, ...safeSettings } = await getAiSettings();
	return safeSettings;
}

export async function saveSettings(admin, changes) {
	const allowed = ["defaultMode", "globalSystemPrompt", "maxHistoryMessages", "maxActiveContexts", "temperature", "maxOutputTokens", "aiEnabled", "modelIdentifier"];
	if (!Object.keys(changes).length || Object.keys(changes).some((key) => !allowed.includes(key))) {
		throw serviceError("AI settings contain unsupported fields");
	}
	if (changes.defaultMode !== undefined && !["general", "it", "music"].includes(changes.defaultMode)) throw serviceError("Invalid default mode");
	if (changes.globalSystemPrompt !== undefined && (typeof changes.globalSystemPrompt !== "string" || changes.globalSystemPrompt.length > 6000)) throw serviceError("Global prompt must be at most 6000 characters");
	if (changes.maxHistoryMessages !== undefined && (!Number.isInteger(changes.maxHistoryMessages) || changes.maxHistoryMessages < 1 || changes.maxHistoryMessages > 40)) throw serviceError("History limit must be from 1 to 40");
	if (changes.maxActiveContexts !== undefined && (!Number.isInteger(changes.maxActiveContexts) || changes.maxActiveContexts < 0 || changes.maxActiveContexts > 3)) throw serviceError("Context limit must be from 0 to 3");
	if (changes.temperature !== undefined && (typeof changes.temperature !== "number" || changes.temperature < 0 || changes.temperature > 2)) throw serviceError("Temperature must be from 0 to 2");
	if (changes.maxOutputTokens !== undefined && (!Number.isInteger(changes.maxOutputTokens) || changes.maxOutputTokens < 64 || changes.maxOutputTokens > 8192)) throw serviceError("Output token limit must be from 64 to 8192");
	if (changes.aiEnabled !== undefined && typeof changes.aiEnabled !== "boolean") throw serviceError("AI enabled must be a boolean");
	if (changes.modelIdentifier !== undefined && (typeof changes.modelIdentifier !== "string" || !/^[\w.-]{1,120}$/.test(changes.modelIdentifier))) throw serviceError("Model identifier is invalid");

	const settings = await updateAiSettings(changes, admin.id);
	await writeAdminActivity({ adminId: admin.id, action: "AI_SETTINGS_UPDATED", targetType: "ai_settings", targetId: 1,
		description: `${admin.name} updated AI settings.`, metadata: { fields: Object.keys(changes) } });
	const { updated_by, ...safeSettings } = settings;
	return safeSettings;
}