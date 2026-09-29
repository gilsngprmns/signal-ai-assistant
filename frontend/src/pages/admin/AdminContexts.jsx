import { useEffect, useMemo, useState } from "react";
import { createAdminContext, deleteAdminContext, getAdminContexts, updateAdminContext } from "../../services/admin.service.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";

const emptyForm = { name: "", slug: "", category: "IT", description: "", keywords: "", contextPrompt: "", priority: 0, isActive: true };

export default function AdminContexts() {
	const [contexts, setContexts] = useState([]);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("");
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const categories = useMemo(() => [...new Set(contexts.map((item) => item.category))].sort(), [contexts]);
	const visible = contexts.filter((item) => (!category || item.category === category) && (!search || `${item.name} ${item.slug} ${item.description} ${item.keywords.join(" ")}`.toLowerCase().includes(search.toLowerCase())));

	async function refresh() {
		try { setContexts(await getAdminContexts()); setError(""); }
		catch (requestError) { setError(requestError.response?.data?.message || "Context labels could not be loaded"); }
	}
	useEffect(() => { refresh(); }, []);

	function startCreate() { setEditingId(null); setForm(emptyForm); setModalOpen(true); setError(""); }
	function startEdit(item) {
		setEditingId(item.id);
		setForm({ name: item.name, slug: item.slug, category: item.category, description: item.description, keywords: item.keywords.join(", "), contextPrompt: item.context_prompt, priority: item.priority, isActive: item.is_active });
		setModalOpen(true); setError("");
	}
	async function submit(event) {
		event.preventDefault(); setSaving(true); setError("");
		const payload = { ...form, priority: Number(form.priority), keywords: form.keywords.split(",").map((word) => word.trim()).filter(Boolean) };
		try {
			if (editingId) await updateAdminContext(editingId, payload);
			else await createAdminContext(payload);
			setModalOpen(false); await refresh();
		} catch (requestError) { setError(requestError.response?.data?.message || "Context could not be saved"); }
		finally { setSaving(false); }
	}
	async function toggle(item) {
		try { await updateAdminContext(item.id, { isActive: !item.is_active }); await refresh(); }
		catch (requestError) { setError(requestError.response?.data?.message || "Context status could not be changed"); }
	}
	async function remove() {
		if (!deleteTarget) return;
		try { await deleteAdminContext(deleteTarget.id); setDeleteTarget(null); await refresh(); }
		catch (requestError) { setError(requestError.response?.data?.message || "Context could not be deleted"); }
	}

	return (
		<main className="admin-content">
			<div className="admin-page-heading"><div><p>AI MANAGEMENT</p><h1>Context labels</h1><small>Dynamic expertise that is selected only when message keywords match.</small></div><button className="admin-button primary" onClick={startCreate}>＋ Add context</button></div>
			{error && !modalOpen && <p className="admin-error" role="alert">{error}</p>}
			<div className="admin-filters"><input className="admin-input" placeholder="Search labels and keywords" aria-label="Search context labels" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="admin-select" aria-label="Filter context category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
			<div className="admin-context-grid">{visible.map((item) => <article className="admin-context-card" key={item.id}>
				<div className="admin-context-top"><div><span className="admin-context-category">{item.category}</span><h2>{item.name}</h2></div><span className={`admin-pill ${item.is_active ? "active" : "suspended"}`}>{item.is_active ? "Active" : "Disabled"}</span></div>
				<p>{item.description}</p><div className="admin-context-keywords">{item.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div>
				<div className="admin-context-meta"><span>Priority <b>{item.priority}</b></span><span>/{item.slug}</span></div>
				<div className="admin-context-actions"><button className="admin-button" onClick={() => startEdit(item)}>Edit</button><button className="admin-button" onClick={() => toggle(item)}>{item.is_active ? "Disable" : "Enable"}</button><button className="admin-button danger" onClick={() => setDeleteTarget(item)}>Delete</button></div>
			</article>)}</div>
			{!visible.length && <section className="admin-panel"><p className="admin-empty">No context labels match these filters.</p></section>}
			{modalOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="context-modal-title">
				<div className="admin-modal-header"><h2 id="context-modal-title">{editingId ? "Edit context" : "Add context"}</h2><button className="admin-button" type="button" onClick={() => setModalOpen(false)}>Close</button></div>
				<form className="admin-modal-form" onSubmit={submit}>
					<div className="admin-field-row"><label className="admin-field">Label name<input className="admin-input" required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label className="admin-field">Slug<input className="admin-input" placeholder="Generated from label name" maxLength={140} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} /></label></div>
					<div className="admin-field-row"><label className="admin-field">Category<input className="admin-input" required maxLength={80} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></label><label className="admin-field">Priority<input className="admin-input" type="number" min="-100" max="1000" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} /></label></div>
					<label className="admin-field">Description<input className="admin-input" maxLength={1200} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
					<label className="admin-field">Keywords <small>Separate keywords with commas</small><input className="admin-input" placeholder="smtp, imap, mx, dkim" value={form.keywords} onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))} /></label>
					<label className="admin-field">AI context / instruction<textarea className="admin-textarea" required maxLength={4000} rows={5} value={form.contextPrompt} onChange={(event) => setForm((current) => ({ ...current, contextPrompt: event.target.value }))} /></label>
					<label className="admin-toggle-field"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Active</label>
					{error && <p className="admin-error" role="alert">{error}</p>}
					<div className="admin-modal-actions"><button className="admin-button" type="button" onClick={() => setModalOpen(false)}>Cancel</button><button className="admin-button primary" disabled={saving}>{saving ? "Saving..." : "Save context"}</button></div>
				</form>
			</section></div>}
			<ConfirmDialog open={Boolean(deleteTarget)} title="Delete context label?" message={`Delete “${deleteTarget?.name || "context"}”? Existing messages and audit entries are unchanged.`} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
		</main>
	);
}