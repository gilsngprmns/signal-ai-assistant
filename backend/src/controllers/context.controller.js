import { createContext, deleteContext, getContext, getContexts, updateContext } from "../services/context.service.js";

function validId(value) {
	return /^\d+$/.test(String(value));
}

export async function list(req, res, next) {
	try { return res.json({ success: true, data: await getContexts(req.query) }); }
	catch (error) { return next(error); }
}

export async function getById(req, res, next) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Context ID is invalid" });
	try { return res.json({ success: true, data: await getContext(req.params.id) }); }
	catch (error) { return next(error); }
}

export async function create(req, res, next) {
	try { return res.status(201).json({ success: true, data: await createContext(req.user, req.body ?? {}) }); }
	catch (error) { return next(error); }
}

export async function update(req, res, next) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Context ID is invalid" });
	try { return res.json({ success: true, data: await updateContext(req.user, req.params.id, req.body ?? {}) }); }
	catch (error) { return next(error); }
}

export async function remove(req, res, next) {
	if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Context ID is invalid" });
	try { return res.json({ success: true, data: await deleteContext(req.user, req.params.id) }); }
	catch (error) { return next(error); }
}