import { useEffect, useState } from "react";
import { getAdminDashboard } from "../../services/admin.service.js";

function number(value) {
	return value == null ? "—" : Number(value).toLocaleString();
}

function Chart({ title, items, valueKey, label }) {
	const maximum = Math.max(1, ...items.map((item) => Number(item[valueKey]) || 0));
	const chartWidth = 600;
	const chartHeight = 150;
	const points = items.map((item, index) => {
		const value = Number(item[valueKey]) || 0;
		const x = items.length < 2 ? chartWidth / 2 : index / (items.length - 1) * chartWidth;
		const y = chartHeight - value / maximum * (chartHeight - 12) - 4;
		return { x, y, value, day: item.day };
	});
	const pointString = points.map(({ x, y }) => `${x},${y}`).join(" ");
	return (
		<section className="admin-panel">
			<div className="admin-panel-heading"><h2>{title}</h2><span>LAST 14 DAYS</span></div>
			{points.length ? <div className="admin-line-chart">
				<svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${title} over the last 14 days`} preserveAspectRatio="none">
					{[0, 1, 2, 3].map((line) => <line key={line} x1="0" x2={chartWidth} y1={line * chartHeight / 3} y2={line * chartHeight / 3} className="admin-chart-gridline" />)}
					<polyline points={pointString} className="admin-chart-line" />
					{points.map((point) => <circle key={point.day} cx={point.x} cy={point.y} r="3" className="admin-chart-point"><title>{new Date(point.day).toLocaleDateString()}: {point.value} {label}</title></circle>)}
				</svg>
				<div className="admin-chart-labels"><span>{new Date(items[0].day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><span>{new Date(items.at(-1).day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
			</div> : <p className="admin-empty">No usage data for this period.</p>}
			<p className="admin-chart-legend">{label} per day · exact values available on each point</p>
		</section>
	);
}

export default function AdminDashboard() {
	const [data, setData] = useState(null);
	const [error, setError] = useState("");

	useEffect(() => {
		getAdminDashboard().then(setData).catch((requestError) => setError(requestError.response?.data?.message || "Dashboard data could not be loaded"));
	}, []);

	if (error) return <main className="admin-content"><p className="admin-error" role="alert">{error}</p></main>;
	if (!data) return <main className="admin-content"><p className="admin-empty">Loading system overview...</p></main>;

	const stats = data.stats;
	const cards = [
		["Total users", stats.total_users, "Registered accounts"],
		["Conversations", stats.total_conversations, "Across all accounts"],
		["Messages", stats.total_messages, "Persisted messages"],
		["AI requests today", stats.ai_requests_today, "Provider calls recorded"],
		["Active users", stats.active_users, "Logged in within 30 days"],
		["Failed AI requests", stats.failed_ai_requests, "Recorded provider failures"],
		["Token usage", stats.estimated_token_usage, "Provider-reported total"],
		["Avg. response time", stats.average_response_time_ms == null ? null : `${number(stats.average_response_time_ms)} ms`, "Successful requests"],
	];

	return (
		<main className="admin-content">
			<div className="admin-page-heading"><div><p>SYSTEM OVERVIEW</p><h1>Dashboard</h1><small>Current platform activity and service health.</small></div></div>
			<div className="admin-stat-grid">{cards.map(([label, value, note]) => <article className="admin-stat" key={label}><span>{label}</span><strong>{value == null ? "—" : typeof value === "string" ? value : number(value)}</strong><small>{note}</small></article>)}</div>
			<div className="admin-dashboard-grid">
				<Chart title="AI requests" items={data.requestsOverTime} valueKey="requests" label="requests" />
				<Chart title="Conversations created" items={data.conversationsOverTime} valueKey="conversations" label="conversations" />
				<Chart title="Active users" items={data.activeUsersOverTime} valueKey="active_users" label="users" />
				<section className="admin-panel"><div className="admin-panel-heading"><h2>Service status</h2><span>LIVE CHECK</span></div>
					<div className="admin-service-status"><span>Database</span><strong>{data.services.database}</strong></div>
					<div className="admin-service-status"><span>Gemini API key</span><strong className={data.services.gemini === "configured" ? "" : "failed"}>{data.services.gemini?.replaceAll("_", " ")}</strong></div>
				</section>
				<section className="admin-panel"><div className="admin-panel-heading"><h2>Recent users</h2><span>{data.recentUsers.length} SHOWN</span></div>
					<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>USER</th><th>ROLE</th><th>JOINED</th></tr></thead><tbody>{data.recentUsers.map((user) => <tr key={user.id}><td data-label="User">{user.name}<small>{user.email}</small></td><td data-label="Role"><span className={`admin-pill ${user.role}`}>{user.role}</span></td><td data-label="Joined">{new Date(user.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
				</section>
				<section className="admin-panel"><div className="admin-panel-heading"><h2>Recent conversations</h2><span>METADATA ONLY</span></div>
					<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>TITLE</th><th>OWNER</th><th>MODE</th><th>MESSAGES</th></tr></thead><tbody>{data.recentConversations.map((conversation) => <tr key={conversation.id}><td data-label="Conversation">{conversation.title}</td><td data-label="Owner">{conversation.owner_name}</td><td data-label="Mode">{conversation.mode}</td><td data-label="Messages">{conversation.message_count}</td></tr>)}</tbody></table></div>
				</section>
				<section className="admin-panel"><div className="admin-panel-heading"><h2>Recent admin activity</h2><span>AUDIT TRAIL</span></div>
					{data.recentActivity.length ? data.recentActivity.map((item) => <div className="admin-service-status" key={item.id}><span>{item.description}<small>{item.admin_name || "Admin"} · {new Date(item.created_at).toLocaleString()}</small></span><strong>{item.action.replaceAll("_", " ")}</strong></div>) : <p className="admin-empty">No admin activity recorded.</p>}
				</section>
			</div>
		</main>
	);
}