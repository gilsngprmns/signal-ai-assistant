import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDocuments } from "../services/document.service.js";
import { getConversations } from "../services/chat.service.js";
import formatFileSize from "../utils/formatFileSize.js";

export default function Dashboard() {
	const [documents, setDocuments] = useState([]);
	const [conversations, setConversations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		Promise.all([getDocuments(), getConversations()])
			.then(([documentItems, conversationItems]) => {
				setDocuments(documentItems);
				setConversations(conversationItems);
			})
			.catch((requestError) => setError(requestError.response?.data?.message || "Workspace data could not be loaded"))
			.finally(() => setLoading(false));
	}, []);

	const readyCount = documents.filter((document) => document.status === "ready").length;

	return (
		<main className="workspace-content dashboard-content">
			<div className="page-heading">
				<div><p className="eyebrow">YOUR KNOWLEDGE SPACE</p><h1>Overview</h1></div>
				<Link className="action-link" to="/documents">Add documents <span aria-hidden="true">→</span></Link>
			</div>
			{error && <p className="notice-error" role="alert">{error}</p>}
			<section className="stat-grid" aria-label="Workspace totals">
				<article className="stat-item"><span>Documents</span><strong>{loading ? "–" : documents.length}</strong><small>Stored in your workspace</small></article>
				<article className="stat-item stat-highlight"><span>Ready to ask</span><strong>{loading ? "–" : readyCount}</strong><small>Processed and searchable</small></article>
				<article className="stat-item"><span>Conversations</span><strong>{loading ? "–" : conversations.length}</strong><small>Saved chat threads</small></article>
			</section>
			<section className="content-section">
				<div className="section-heading"><div><p className="eyebrow">LATEST ADDITIONS</p><h2>Recent documents</h2></div><Link to="/documents">View all <span aria-hidden="true">→</span></Link></div>
				{loading ? <p className="empty-line">Loading workspace...</p> : documents.length ? (
					<div className="recent-list">{documents.slice(0, 5).map((document) => (
						<Link className="recent-row" to="/documents" key={document.id}>
							<span className="file-stamp">{document.original_name.split(".").pop()?.slice(0, 4).toUpperCase()}</span>
							<span className="recent-name"><strong>{document.original_name}</strong><small>{formatFileSize(Number(document.file_size))} · {new Date(document.created_at).toLocaleDateString()}</small></span>
							<span className={`status-label status-${document.status}`}>{document.status}</span>
						</Link>
					))}</div>
				) : <div className="empty-state"><p>Your document library is empty.</p><Link to="/documents">Upload your first document</Link></div>}
			</section>
		</main>
	);
}
