import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteConversation, getConversations, updateConversation } from "../services/chat.service.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

export default function History() {
	const [conversations, setConversations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [draftTitle, setDraftTitle] = useState("");
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleting, setDeleting] = useState(false);
	const navigate = useNavigate();

	const refresh = useCallback(async () => {
		try {
			setConversations(await getConversations());
		} catch (requestError) {
			setError(requestError.response?.data?.message || "History could not be loaded");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { refresh(); }, [refresh]);

	async function remove() {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await deleteConversation(deleteTarget.id);
			setConversations((current) => current.filter((conversation) => conversation.id !== deleteTarget.id));
			setDeleteTarget(null);
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Conversation could not be deleted");
		} finally { setDeleting(false); }
	}

	function beginRename(conversation) {
		setEditingId(conversation.id);
		setDraftTitle(conversation.title);
		setError("");
	}

	async function saveRename(id) {
		try {
			const updated = await updateConversation(id, { title: draftTitle.trim() });
			setConversations((current) => current.map((item) => item.id === id ? { ...item, ...updated } : item));
			setEditingId(null);
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Conversation could not be renamed");
		}
	}

	return (
		<main className="workspace-content page-content">
			<div className="page-heading"><div><p className="eyebrow">YOUR CONVERSATIONS</p><h1>All chats</h1></div></div>
			{error && <p className="notice-error" role="alert">{error}</p>}
			{loading ? <p className="empty-line">Loading chats...</p> : conversations.length ? <div className="history-list">{conversations.map((conversation) => (
				<article className="history-row" key={conversation.id}>
					{editingId === conversation.id ? (
						<form className="rename-form" onSubmit={(event) => { event.preventDefault(); saveRename(conversation.id); }}>
							<input aria-label="Conversation title" value={draftTitle} maxLength={120} onChange={(event) => setDraftTitle(event.target.value)} autoFocus />
							<button type="submit" disabled={!draftTitle.trim()}>Save</button>
							<button type="button" onClick={() => setEditingId(null)}>Cancel</button>
						</form>
					) : <>
						<button className="history-open" type="button" onClick={() => navigate(`/app/chat?conversationId=${conversation.id}`)}>
							<span className={`mode-dot mode-${conversation.mode || "general"}`} />
							<span className="history-title"><strong>{conversation.title}</strong><small>{(conversation.mode || "general").toUpperCase()} · {new Date(conversation.updated_at).toLocaleString()} · {conversation.message_count} messages</small></span>
						</button>
						<div className="history-actions">
							<button className="delete-text-button" type="button" onClick={() => beginRename(conversation)} aria-label={`Rename ${conversation.title}`}>Rename</button>
							<button className="delete-text-button" type="button" onClick={() => setDeleteTarget(conversation)} aria-label={`Delete ${conversation.title}`}>Delete</button>
						</div>
						<details className="history-mobile-actions"><summary aria-label={`Actions for ${conversation.title}`}>•••</summary><div><button type="button" onClick={() => beginRename(conversation)}>Rename</button><button className="danger" type="button" onClick={() => remove(conversation)}>Delete</button></div></details>
					</>}
				</article>
			))}</div> : <div className="empty-state"><p>No conversations yet.</p><span>Questions you ask will appear here.</span></div>}
			<ConfirmDialog open={Boolean(deleteTarget)} title="Delete conversation?" message={`“${deleteTarget?.title || "Conversation"}” and its messages will be permanently deleted.`} busy={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
		</main>
	);
}
