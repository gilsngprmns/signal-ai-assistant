import {
	changeUser,
	getActivity,
	getAdminDashboard,
	getConversations,
	getSettings,
	getUsage,
	getUserDetails,
	getUsers,
	removeConversation,
	removeUser,
	saveSettings,
} from "../services/admin.service.js";
import { isGeminiConfigured } from "../config/gemini.js";

function validId(value) {
	return /^\d+$/.test(String(value));
}

function handleError(next, error) {
	return next(error);
}

export async function dashboard(req, res, next) {
	try {
		return res.json({ success: true, data: await getAdminDashboard(isGeminiConfigured()) });
	} catch (error) { return handleError(next, error); }
}

export async function users(req, res, next) {
	try { return res.json({ success: true, data: await getUsers(req.query) }); }
	catch (error) { return handleError(next, error); }
}

export async function userById(req, res, next) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "User ID is invalid" });
	try { return res.json({ success: true, data: await getUserDetails(req.params.id) }); }
	catch (error) { return handleError(next, error); }
}

export async function patchUser(req, res, next) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "User ID is invalid" });
	try { return res.json({ success: true, data: await changeUser(req.user, req.params.id, req.body ?? {}) }); }
	catch (error) { return handleError(next, error); }
}

export async function deleteUser(req, res, next) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "User ID is invalid" });
	try { return res.json({ success: true, data: await removeUser(req.user, req.params.id) }); }
	catch (error) { return handleError(next, error); }
}

export async function conversations(req, res, next) {
	try { return res.json({ success: true, data: await getConversations(req.query) }); }
	catch (error) { return handleError(next, error); }
}

export async function deleteConversation(req, res, next) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Conversation ID is invalid" });
	try { return res.json({ success: true, data: await removeConversation(req.user, req.params.id) }); }
	catch (error) { return handleError(next, error); }
}

export async function usage(req, res, next) {
	try { return res.json({ success: true, data: await getUsage(req.query) }); }
	catch (error) { return handleError(next, error); }
}

export async function activity(req, res, next) {
	try { return res.json({ success: true, data: await getActivity(req.query) }); }
	catch (error) { return handleError(next, error); }
}

export async function aiSettings(req, res, next) {
	try { return res.json({ success: true, data: await getSettings() }); }
	catch (error) { return handleError(next, error); }
}

export async function patchAiSettings(req, res, next) {
	try { return res.json({ success: true, data: await saveSettings(req.user, req.body ?? {}) }); }
	catch (error) { return handleError(next, error); }
}