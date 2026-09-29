import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth.js";
import { deleteAdminUser, getAdminUser, getAdminUsers, updateAdminUser } from "../../services/admin.service.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";

const errorText = (error) => error.response?.data?.message || "User action could not be completed";

export default function AdminUsers() {
	const { user: currentUser } = useAuth();
	const [filters, setFilters] = useState({ search: "", role: "", status: "", page: 1, limit: 25 });
	const [result, setResult] = useState(null);
	const [details, setDetails] = useState(null);
	const [error, setError] = useState("");
	const [loadingId, setLoadingId] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);

	useEffect(() => {
		const timer = setTimeout(() => getAdminUsers(filters).then(setResult).catch((requestError) => setError(errorText(requestError))), 180);
		return () => clearTimeout(timer);
	}, [filters]);

	function setFilter(name, value) {
		setFilters((current) => ({ ...current, [name]: value, page: 1 }));
	}

	async function update(user, changes) {
		setLoadingId(user.id); setError("");
		try {
			await updateAdminUser(user.id, changes);
			setResult(await getAdminUsers(filters));
			if (details?.id === user.id) setDetails(await getAdminUser(user.id));
		} catch (requestError) { setError(errorText(requestError)); }
		finally { setLoadingId(null); }
	}

	async function remove() {
		if (!deleteTarget) return;
		const user = deleteTarget;
		setLoadingId(user.id); setError("");
		try {
			await deleteAdminUser(user.id);
			if (details?.id === user.id) setDetails(null);
			setDeleteTarget(null);
			setResult(await getAdminUsers(filters));
		} catch (requestError) { setError(errorText(requestError)); }
		finally { setLoadingId(null); }
	}

	async function toggleDetails(id) {
		if (details?.id === id) return setDetails(null);
		try { setDetails(await getAdminUser(id)); setError(""); }
		catch (requestError) { setError(errorText(requestError)); }
	}

	const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / filters.limit));
	return (
		<main className="admin-content">
			<div className="admin-page-heading"><div><p>MANAGEMENT</p><h1>Users</h1><small>Account access, roles, and activity metadata.</small></div><span className="admin-pill">{result?.total ?? "—"} accounts</span></div>
			{error && <p className="admin-error" role="alert">{error}</p>}
			<div className="admin-filters">
				<input className="admin-input" aria-label="Search users" placeholder="Search name or email" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
				<select className="admin-select" aria-label="Filter role" value={filters.role} onChange={(event) => setFilter("role", event.target.value)}><option value="">All roles</option><option value="user">User</option><option value="admin">Admin</option></select>
				<select className="admin-select" aria-label="Filter account status" value={filters.status} onChange={(event) => setFilter("status", event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
			</div>
			<section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>USER</th><th>ROLE</th><th>STATUS</th><th>CONVERSATIONS</th><th>CREATED</th><th>LAST LOGIN</th><th>ACTIONS</th></tr></thead>
				<tbody>{result?.users.map((account) => <tr key={account.id}>
					<td data-label="User">{account.name}<small>{account.email} · #{account.id}</small></td>
					<td data-label="Role"><span className={`admin-pill ${account.role}`}>{account.role}</span></td>
					<td data-label="Status"><span className={`admin-pill ${account.status}`}>{account.status}</span></td>
					<td data-label="Conversations">{account.conversation_count}</td><td data-label="Created">{new Date(account.created_at).toLocaleDateString()}</td><td data-label="Last login">{account.last_login ? new Date(account.last_login).toLocaleString() : "Never"}</td>
					<td data-label="Actions"><div className="desktop-user-actions"><div className="admin-row-actions">
						<button className="admin-button" disabled={loadingId === account.id} onClick={() => toggleDetails(account.id)}>View</button>
						<button className="admin-button" disabled={loadingId === account.id || String(currentUser?.id) === String(account.id)} onClick={() => update(account, { role: account.role === "admin" ? "user" : "admin" })}>{account.role === "admin" ? "Make user" : "Make admin"}</button>
						<button className="admin-button" disabled={loadingId === account.id || String(currentUser?.id) === String(account.id)} onClick={() => update(account, { status: account.status === "active" ? "suspended" : "active" })}>{account.status === "active" ? "Suspend" : "Activate"}</button>
						<button className="admin-button danger" disabled={loadingId === account.id || String(currentUser?.id) === String(account.id)} onClick={() => setDeleteTarget(account)}>Delete</button>
					</div></div><details className="mobile-user-actions"><summary>Actions</summary><div>
						<button className="admin-button" disabled={loadingId === account.id} onClick={() => toggleDetails(account.id)}>View details</button>
						<button className="admin-button" disabled={loadingId === account.id || String(currentUser?.id) === String(account.id)} onClick={() => update(account, { role: account.role === "admin" ? "user" : "admin" })}>{account.role === "admin" ? "Make user" : "Make admin"}</button>
						<button className="admin-button" disabled={loadingId === account.id || String(currentUser?.id) === String(account.id)} onClick={() => update(account, { status: account.status === "active" ? "suspended" : "active" })}>{account.status === "active" ? "Suspend" : "Activate"}</button>
						<button className="admin-button danger" disabled={loadingId === account.id || String(currentUser?.id) === String(account.id)} onClick={() => setDeleteTarget(account)}>Delete account</button>
					</div></details></td>
				</tr>)}</tbody>
			</table>{!result?.users.length && <p className="admin-empty">No accounts match these filters.</p>}</div>
				{details && <div className="admin-service-status"><span>Account #{details.id}: {details.name} · {details.email}<small>{details.message_count} messages · {details.conversation_count} conversations · joined {new Date(details.created_at).toLocaleString()}</small></span><button className="admin-button" onClick={() => setDetails(null)}>Close</button></div>}
				<div className="admin-pagination"><span>Page {filters.page} of {totalPages}</span><div><button className="admin-button" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</button><button className="admin-button" disabled={filters.page >= totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button></div></div>
			</section>
			<ConfirmDialog open={Boolean(deleteTarget)} title="Delete user account?" message={`Delete ${deleteTarget?.name || "this user"} and their account data? This cannot be undone.`} busy={loadingId === deleteTarget?.id} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
		</main>
	);
}