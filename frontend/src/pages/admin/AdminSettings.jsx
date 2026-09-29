import { useEffect, useState } from "react";
import { getAdminSettings, updateAdminSettings } from "../../services/admin.service.js";

function toFormSettings(value) {
	return {
		defaultMode: value.default_mode,
		globalSystemPrompt: value.global_system_prompt,
		maxHistoryMessages: value.max_history_messages,
		maxActiveContexts: value.max_active_contexts,
		temperature: Number(value.temperature),
		maxOutputTokens: value.max_output_tokens,
		aiEnabled: value.ai_enabled,
		modelIdentifier: value.model_identifier,
	};
}

export default function AdminSettings() {
	const [settings, setSettings] = useState(null);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => { getAdminSettings().then((value) => setSettings(toFormSettings(value))).catch((requestError) => setError(requestError.response?.data?.message || "AI settings could not be loaded")); }, []);

	function field(name, value) { setSettings((current) => ({ ...current, [name]: value })); }
	async function save(event) {
		event.preventDefault(); setSaving(true); setError(""); setNotice("");
		try { setSettings(toFormSettings(await updateAdminSettings(settings))); setNotice("AI settings updated."); }
		catch (requestError) { setError(requestError.response?.data?.message || "AI settings could not be saved"); }
		finally { setSaving(false); }
	}

	if (error && !settings) return <main className="admin-content"><p className="admin-error" role="alert">{error}</p></main>;
	if (!settings) return <main className="admin-content"><p className="admin-empty">Loading AI settings...</p></main>;
	return (
		<main className="admin-content">
			<div className="admin-page-heading"><div><p>AI MANAGEMENT</p><h1>AI settings</h1><small>Operational controls only. Provider keys remain in the backend environment.</small></div></div>
			{error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
			<form className="admin-panel" onSubmit={save}>
				<div className="admin-panel-heading"><h2>Generation configuration</h2><span>NO SECRET VALUES</span></div>
				<div className="admin-form-grid">
					<label className="admin-field">Default mode<select className="admin-select" value={settings.defaultMode} onChange={(event) => field("defaultMode", event.target.value)}><option value="general">General</option><option value="it">IT</option><option value="music">Music</option></select></label>
					<label className="admin-field">Model identifier<input className="admin-input" required maxLength={120} value={settings.modelIdentifier} onChange={(event) => field("modelIdentifier", event.target.value)} /></label>
					<label className="admin-field">History messages<input className="admin-input" type="number" min="1" max="40" value={settings.maxHistoryMessages} onChange={(event) => field("maxHistoryMessages", Number(event.target.value))} /></label>
					<label className="admin-field">Maximum context labels<input className="admin-input" type="number" min="0" max="3" value={settings.maxActiveContexts} onChange={(event) => field("maxActiveContexts", Number(event.target.value))} /></label>
					<label className="admin-field">Temperature<input className="admin-input" type="number" min="0" max="2" step="0.05" value={settings.temperature} onChange={(event) => field("temperature", Number(event.target.value))} /></label>
					<label className="admin-field">Maximum output tokens<input className="admin-input" type="number" min="64" max="8192" value={settings.maxOutputTokens} onChange={(event) => field("maxOutputTokens", Number(event.target.value))} /></label>
					<label className="admin-field full">Global system prompt<textarea className="admin-textarea" maxLength={6000} rows={6} value={settings.globalSystemPrompt} onChange={(event) => field("globalSystemPrompt", event.target.value)} /></label>
					<label className="admin-toggle-field"><input type="checkbox" checked={settings.aiEnabled} onChange={(event) => field("aiEnabled", event.target.checked)} /> AI enabled</label>
				</div>
				<div className="admin-panel-heading"><span>Changes are recorded in admin activity logs.</span><button className="admin-button primary" disabled={saving}>{saving ? "Saving..." : "Save settings"}</button></div>
			</form>
		</main>
	);
}