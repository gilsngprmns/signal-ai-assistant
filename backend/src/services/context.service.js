import {
	createContext as insertContext,
	deleteContext as deleteContextRecord,
	findContext,
	listContexts,
	updateContext as updateContextRecord,
} from "../repositories/context.repository.js";
import { writeAdminActivity } from "../repositories/admin.repository.js";

function contextError(message, statusCode = 400) {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
}

function makeSlug(value) {
	return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 140);
}

function validateContext(input, partial = false) {
	const result = {};
	for (const field of ["name", "category", "contextPrompt"]) {
		if (input[field] === undefined && partial) continue;
		if (typeof input[field] !== "string") throw contextError(`${field} must be a string`);
		result[field] = input[field].trim();
	}
	if (input.description !== undefined) {
		if (typeof input.description !== "string") throw contextError("description must be a string");
		result.description = input.description.trim();
	}
	if ((!partial || input.slug !== undefined) && input.slug !== undefined && typeof input.slug !== "string") throw contextError("slug must be a string");
	if (input.slug !== undefined) result.slug = makeSlug(input.slug || input.name || "");
	else if (input.name !== undefined) result.slug = makeSlug(input.name);
	if (!partial && !result.slug) result.slug = makeSlug(result.name);
	if ((!partial || input.keywords !== undefined) && input.keywords !== undefined && (!Array.isArray(input.keywords) || input.keywords.length > 50 || input.keywords.some((keyword) => typeof keyword !== "string"))) {
		throw contextError("keywords must be an array of up to 50 strings");
	}
	if (input.keywords !== undefined) result.keywords = [...new Set(input.keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean))];
	if (input.priority !== undefined) {
		if (!Number.isInteger(input.priority) || input.priority < -100 || input.priority > 1000) throw contextError("priority must be from -100 to 1000");
		result.priority = input.priority;
	}
	if (input.isActive !== undefined) {
		if (typeof input.isActive !== "boolean") throw contextError("isActive must be a boolean");
		result.isActive = input.isActive;
	}
	if (!partial) {
		result.description ??= "";
		result.keywords ??= [];
		result.priority ??= 0;
		result.isActive ??= true;
	}
	const fields = ["name", "category", "description", "contextPrompt"];
	if (fields.some((field) => result[field] !== undefined && result[field].length > (field === "contextPrompt" ? 4000 : 1200))) throw contextError("Context field exceeds its length limit");
	if (result.name !== undefined && !result.name) throw contextError("Context name is required");
	if (result.category !== undefined && !result.category) throw contextError("Context category is required");
	if (result.contextPrompt !== undefined && !result.contextPrompt) throw contextError("AI context prompt is required");
	if (result.slug !== undefined && !result.slug) throw contextError("Slug must contain letters or numbers");
	return result;
}

export function getContexts(filters) {
	return listContexts({ search: typeof filters.search === "string" ? filters.search.trim().slice(0, 120) : "",
		category: typeof filters.category === "string" ? filters.category.trim().slice(0, 80) : "" });
}

export async function getContext(id) {
	const context = await findContext(id);
	if (!context) throw contextError("Context not found", 404);
	return context;
}

export async function createContext(admin, input) {
	let context;
	try { context = await insertContext(validateContext(input), admin.id); }
	catch (error) { if (error.code === "23505") throw contextError("A context with this slug already exists", 409); throw error; }
	await writeAdminActivity({ adminId: admin.id, action: "CONTEXT_CREATED", targetType: "ai_context", targetId: context.id,
		description: `${admin.name} created AI context: ${context.name}.` });
	return context;
}

export async function updateContext(admin, id, input) {
	await getContext(id);
	const changes = validateContext(input, true);
	if (!Object.keys(changes).length) throw contextError("Provide at least one context field to update");
	let context;
	try { context = await updateContextRecord(id, changes); }
	catch (error) { if (error.code === "23505") throw contextError("A context with this slug already exists", 409); throw error; }
	const action = changes.isActive === false ? "CONTEXT_DISABLED" : "CONTEXT_UPDATED";
	await writeAdminActivity({ adminId: admin.id, action, targetType: "ai_context", targetId: id,
		description: `${admin.name} ${action === "CONTEXT_DISABLED" ? "disabled" : "updated"} AI context: ${context.name}.` });
	return context;
}

export async function deleteContext(admin, id) {
	const context = await deleteContextRecord(id);
	if (!context) throw contextError("Context not found", 404);
	await writeAdminActivity({ adminId: admin.id, action: "CONTEXT_DELETED", targetType: "ai_context", targetId: id,
		description: `${admin.name} deleted AI context: ${context.name}.` });
	return context;
}