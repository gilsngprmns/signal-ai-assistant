import { useEffect, useState } from "react";
import { getAdminUsage } from "../../services/admin.service.js";

function display(value) { return value == null ? "—" : Number(value).toLocaleString(); }

export default function AdminUsage() {
	const [days, setDays] = useState(30);
	const [data, setData] = useState(null);
	const [error, setError] = useState("");

	useEffect(() => { getAdminUsage({ days }).then(setData).catch((requestError) => setError(requestError.response?.data?.message || "Usage data could not be loaded")); }, [days]);
	if (error) return <main className="admin-content"><p className="admin-error" role="alert">{error}</p></main>;
	if (!data) return <main className="admin-content"><p className="admin-empty">Loading usage data...</p></main>;
	const summary = data.summary;
	const cards = [["Requests", summary.requests], ["Successful", summary.successful_requests], ["Failed", summary.failed_requests], ["Reported tokens", summary.total_tokens], ["Avg. TTFT", summary.average_ttft_ms == null ? null : `${display(summary.average_ttft_ms)} ms`], ["Avg. generation", summary.average_response_time_ms == null ? null : `${display(summary.average_response_time_ms)} ms`]];
	return (
		<main className="admin-content">
			<div className="admin-page-heading"><div><p>AI MANAGEMENT</p><h1>Usage</h1><small>Metrics returned by the provider are stored; unavailable token counts remain empty.</small></div><select className="admin-select" aria-label="Usage period" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select></div>
			<div className="admin-stat-grid admin-stat-grid-five">{cards.map(([label, value]) => <article className="admin-stat" key={label}><span>{label}</span><strong>{value == null ? "—" : typeof value === "string" ? value : display(value)}</strong><small>Selected period</small></article>)}</div>
			<div className="admin-dashboard-grid">
				<section className="admin-panel"><div className="admin-panel-heading"><h2>Usage by mode</h2><span>{days} DAYS</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>MODE</th><th>REQUESTS</th><th>REPORTED TOKENS</th></tr></thead><tbody>{data.byMode.map((row) => <tr key={row.mode}><td>{row.mode || "Unknown"}</td><td>{display(row.requests)}</td><td>{display(row.total_tokens)}</td></tr>)}</tbody></table>{!data.byMode.length && <p className="admin-empty">No usage recorded for this period.</p>}</div></section>
				<section className="admin-panel"><div className="admin-panel-heading"><h2>Top users</h2><span>BY REQUESTS</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>USER</th><th>REQUESTS</th><th>TOKENS</th></tr></thead><tbody>{data.topUsers.map((row) => <tr key={row.id}><td>{row.name}<small>{row.email}</small></td><td>{display(row.requests)}</td><td>{display(row.total_tokens)}</td></tr>)}</tbody></table>{!data.topUsers.length && <p className="admin-empty">No usage recorded for this period.</p>}</div></section>
			</div>
			<section className="admin-panel admin-usage-log"><div className="admin-panel-heading"><h2>Request log</h2><span>NO PROMPTS OR SECRETS STORED</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>TIME</th><th>USER</th><th>MODEL</th><th>MODE</th><th>INPUT TOKENS</th><th>OUTPUT TOKENS</th><th>TTFT</th><th>GENERATION</th><th>STATUS</th><th>ERROR</th></tr></thead><tbody>{data.logs.map((row) => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.user_name || "Deleted account"}</td><td>{row.model}</td><td>{row.mode}</td><td>{display(row.input_tokens)}</td><td>{display(row.output_tokens)}</td><td>{row.ttft_ms == null ? "—" : `${row.ttft_ms} ms`}</td><td>{row.response_time_ms == null ? "—" : `${row.response_time_ms} ms`}</td><td><span className={`admin-pill ${row.status}`}>{row.status}</span></td><td>{row.error_code || "—"}</td></tr>)}</tbody></table>{!data.logs.length && <p className="admin-empty">No AI requests recorded for this period.</p>}</div></section>
		</main>
	);
}