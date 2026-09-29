import { useEffect, useState } from "react";
import { getAdminActivity } from "../../services/admin.service.js";

export default function AdminActivity() {
	const [data, setData] = useState(null);
	const [error, setError] = useState("");
	useEffect(() => { getAdminActivity().then(setData).catch((requestError) => setError(requestError.response?.data?.message || "Activity logs could not be loaded")); }, []);
	return (
		<main className="admin-content">
			<div className="admin-page-heading"><div><p>SYSTEM</p><h1>Activity logs</h1><small>Auditable record of administrative actions.</small></div></div>
			{error && <p className="admin-error" role="alert">{error}</p>}
			<section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>TIME</th><th>ADMIN</th><th>ACTION</th><th>DESCRIPTION</th><th>TARGET</th></tr></thead><tbody>{data?.logs.map((row) => <tr key={row.id}><td data-label="Time">{new Date(row.created_at).toLocaleString()}</td><td data-label="Admin">{row.admin_name || "Deleted admin"}<small>{row.admin_email}</small></td><td data-label="Action"><span className="admin-pill active">{row.action.replaceAll("_", " ").toLowerCase()}</span></td><td data-label="Description">{row.description}</td><td data-label="Target">{row.target_type}{row.target_id ? ` #${row.target_id}` : ""}</td></tr>)}</tbody></table>{data && !data.logs.length && <p className="admin-empty">No admin activity recorded.</p>}{!data && !error && <p className="admin-empty">Loading activity logs...</p>}</div></section>
		</main>
	);
}