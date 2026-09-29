import pool from "../config/database.js";
import { appConfig } from "../config/app.config.js";

let activeContextCache;
let activeContextCacheExpiresAt = 0;
let activeContextLoad;
let aiSettingsCache;
let aiSettingsCacheExpiresAt = 0;
let aiSettingsLoad;

export function invalidateActiveContextsCache() {
	activeContextCache = undefined;
	activeContextCacheExpiresAt = 0;
	activeContextLoad = undefined;
}

export function invalidateAiSettingsCache() {
	aiSettingsCache = undefined;
	aiSettingsCacheExpiresAt = 0;
	aiSettingsLoad = undefined;
}

const contextFields = `id, name, slug, category, description, context_prompt, keywords, priority,
  is_active, created_by, created_at, updated_at`;

export async function listContexts({ search = "", category = "" } = {}) {
	const result = await pool.query(
		`SELECT ${contextFields} FROM ai_context_labels
		 WHERE ($1 = '' OR name ILIKE $2 OR slug ILIKE $2 OR description ILIKE $2)
		   AND ($3 = '' OR category = $3)
		 ORDER BY priority DESC, name ASC`,
		[search, `%${search}%`, category],
	);
	return result.rows;
}

export async function listActiveContexts() {
	if (activeContextCache && activeContextCacheExpiresAt > Date.now()) return activeContextCache;
	if (!activeContextLoad) {
		const load = pool.query(
			`SELECT id, name, category, context_prompt, keywords, priority
			 FROM ai_context_labels WHERE is_active = TRUE ORDER BY priority DESC, id ASC`,
		).then(({ rows }) => {
			if (activeContextLoad === load) {
				activeContextCache = rows;
				activeContextCacheExpiresAt = Date.now() + appConfig.cache.contextTtlMs;
			}
			return rows;
		}).finally(() => { if (activeContextLoad === load) activeContextLoad = undefined; });
		activeContextLoad = load;
	}
	return activeContextLoad;
}

export async function findContext(id) {
	const result = await pool.query(`SELECT ${contextFields} FROM ai_context_labels WHERE id = $1`, [id]);
	return result.rows[0];
}

export async function createContext(context, adminId) {
	const result = await pool.query(
		`INSERT INTO ai_context_labels
		 (name, slug, category, description, context_prompt, keywords, priority, is_active, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING ${contextFields}`,
		[context.name, context.slug, context.category, context.description, context.contextPrompt,
			context.keywords, context.priority, context.isActive, adminId],
	);
	invalidateActiveContextsCache();
	return result.rows[0];
}

export async function updateContext(id, context) {
	const result = await pool.query(
		`UPDATE ai_context_labels SET
		 name = COALESCE($2, name), slug = COALESCE($3, slug), category = COALESCE($4, category),
		 description = COALESCE($5, description), context_prompt = COALESCE($6, context_prompt),
		 keywords = COALESCE($7, keywords), priority = COALESCE($8, priority),
		 is_active = COALESCE($9, is_active), updated_at = NOW()
		 WHERE id = $1 RETURNING ${contextFields}`,
		[id, context.name ?? null, context.slug ?? null, context.category ?? null,
			context.description ?? null, context.contextPrompt ?? null, context.keywords ?? null,
			context.priority ?? null, context.isActive ?? null],
	);
	invalidateActiveContextsCache();
	return result.rows[0];
}

export async function deleteContext(id) {
	const result = await pool.query("DELETE FROM ai_context_labels WHERE id = $1 RETURNING id, name", [id]);
	if (result.rowCount) invalidateActiveContextsCache();
	return result.rows[0];
}

export async function getAiSettings() {
	if (aiSettingsCache && aiSettingsCacheExpiresAt > Date.now()) return aiSettingsCache;
	if (!aiSettingsLoad) {
		const load = pool.query(`SELECT id, default_mode, global_system_prompt, max_history_messages,
			max_active_contexts, temperature, max_output_tokens, ai_enabled, model_identifier, updated_by, updated_at
			FROM ai_settings WHERE id = 1`)
			.then(({ rows }) => {
				if (aiSettingsLoad === load) {
					aiSettingsCache = rows[0];
					aiSettingsCacheExpiresAt = Date.now() + appConfig.cache.settingsTtlMs;
				}
				return rows[0];
			})
			.finally(() => { if (aiSettingsLoad === load) aiSettingsLoad = undefined; });
		aiSettingsLoad = load;
	}
	return aiSettingsLoad;
}

export async function updateAiSettings(settings, adminId) {
	const result = await pool.query(
		`UPDATE ai_settings SET default_mode = COALESCE($1, default_mode),
		 global_system_prompt = COALESCE($2, global_system_prompt),
		 max_history_messages = COALESCE($3, max_history_messages),
		 max_active_contexts = COALESCE($4, max_active_contexts),
		 temperature = COALESCE($5, temperature), max_output_tokens = COALESCE($6, max_output_tokens),
		 ai_enabled = COALESCE($7, ai_enabled), model_identifier = COALESCE($8, model_identifier),
		 updated_by = $9, updated_at = NOW()
		 WHERE id = 1
		 RETURNING id, default_mode, global_system_prompt, max_history_messages, max_active_contexts,
		 temperature, max_output_tokens, ai_enabled, model_identifier, updated_by, updated_at`,
		[settings.defaultMode ?? null, settings.globalSystemPrompt ?? null,
			settings.maxHistoryMessages ?? null, settings.maxActiveContexts ?? null,
			settings.temperature ?? null, settings.maxOutputTokens ?? null,
			settings.aiEnabled ?? null, settings.modelIdentifier ?? null, adminId],
	);
	invalidateAiSettingsCache();
	return result.rows[0];
}