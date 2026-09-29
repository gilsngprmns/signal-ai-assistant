import { useEffect, useState } from "react";
import { deleteAdminConversation, getAdminConversations } from "../../services/admin.service.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";

export default function AdminConversations() {
	const [filters, setFilters] = useState({ search: "", userId: "", mode: "" });
	const [rows, setRows] = useState([]);
	const [error, setError] = useState("");
	const [loadingId, setLoadingId] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);

	useEffect(() => {
		const timer = setTimeout(() => getAdminConversations(filters).then(setRows).catch((requestError) => setError(requestError.response?.data?.message || "Conversations could not be loaded")), 180);
		return () => clearTimeout(timer);
	}, [filters]);

	async function remove() {
		if (!deleteTarget) return;
		const conversation = deleteTarget;
		setLoadingId(conversation.id); setError("");
		try { await deleteAdminConversation(conversation.id); setRows((current) => current.filter((item) => item.id !== conversation.id)); setDeleteTarget(null); }
		catch (requestError) { setError(requestError.response?.data?.message || "Conversation could not be deleted"); }
		finally { setLoadingId(null); }
	}

	return (
		<main className="admin-content">
			<div className="admin-page-heading"><div><p>MANAGEMENT</p><h1>Conversations</h1><small>Metadata only. Private message contents are not shown.</small></div><span className="admin-pill">{rows.length} results</span></div>
			{error && <p className="admin-error" role="alert">{error}</p>}
			<div className="admin-filters"><input className="admin-input" placeholder="Search title or owner" aria-label="Search conversations" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
				<input className="admin-input" type="number" min="1" placeholder="Filter by user ID" aria-label="Filter by user ID" value={filters.userId} onChange={(event) => setFilters((current) => ({ ...current, userId: event.target.value }))} />
				<select className="admin-select" aria-label="Filter conversation mode" value={filters.mode} onChange={(event) => setFilters((current) => ({ ...current, mode: event.target.value }))}><option value="">All modes</option><option value="general">General</option><option value="it">IT</option><option value="music">Music</option></select>
			</div>
			<section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CONVERSATION</th><th>OWNER</th><th>MODE</th><th>MESSAGES</th><th>CREATED</th><th>UPDATED</th><th>STATUS</th><th>ACTION</th></tr></thead>
				<tbody>{rows.map((row) => <tr key={row.id}><td data-label="Conversation">{row.title}<small>#{row.id}</small></td><td data-label="Owner">{row.owner_name}<small>{row.owner_email} · #{row.user_id}</small></td><td data-label="Mode">{row.mode}</td><td data-label="Messages">{row.message_count}</td><td data-label="Created">{new Date(row.created_at).toLocaleDateString()}</td><td data-label="Updated">{new Date(row.updated_at).toLocaleString()}</td><td data-label="Status"><span className="admin-pill active">stored</span></td><td data-label="Actions"><button className="admin-button danger" disabled={loadingId === row.id} onClick={() => setDeleteTarget(row)}>Delete</button></td></tr>)}</tbody>
			</table>{!rows.length && <p className="admin-empty">No conversations match these filters.</p>}</div></section>
			<ConfirmDialog open={Boolean(deleteTarget)} title="Delete conversation?" message={`Delete “${deleteTarget?.title || "Conversation"}”? Its messages will also be deleted.`} busy={loadingId === deleteTarget?.id} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
		</main>
	);
}