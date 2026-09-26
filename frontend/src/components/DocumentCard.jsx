import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteDocument, getDocumentFile } from "../services/document.service.js";
import formatFileSize from "../utils/formatFileSize.js";

export default function DocumentCard({ document, onDeleted }) {
	const [error, setError] = useState("");
	const [opening, setOpening] = useState(false);
	const navigate = useNavigate();
	const extension = document.original_name.split(".").pop()?.toUpperCase() || "FILE";

	async function handleDelete() {
		if (!window.confirm(`Delete ${document.original_name}?`)) return;
		setError("");
		try {
			await deleteDocument(document.id);
			onDeleted(document.id);
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Document could not be deleted");
		}
	}

	async function handleOpen() {
		setError("");
		const documentWindow = window.open("about:blank", "_blank");
		if (!documentWindow) {
			setError("Allow pop-ups to open this document");
			return;
		}
		documentWindow.opener = null;
		setOpening(true);
		try {
			const file = await getDocumentFile(document.id);
			const objectUrl = URL.createObjectURL(file);
			documentWindow.location.href = objectUrl;
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
		} catch (requestError) {
			documentWindow.close();
			setError(requestError.response?.data?.message || "Document could not be opened");
		} finally {
			setOpening(false);
		}
	}

	return (
		<article className="document-row">
			<span className="file-stamp">{extension.slice(0, 4)}</span>
			<div className="document-main"><strong>{document.original_name}</strong><small>{formatFileSize(Number(document.file_size))} · {new Date(document.created_at).toLocaleDateString()}</small>{error && <span className="form-error">{error}</span>}</div>
			<span className={`status-label status-${document.status}`}>{document.status}</span>
			<div className="document-actions">
				<button type="button" title="Open document" aria-label={`Open ${document.original_name}`} disabled={opening} onClick={handleOpen}>{opening ? "Opening..." : "Open"}</button>
				<button type="button" title="Ask AI about this document" aria-label={`Ask AI about ${document.original_name}`} onClick={() => navigate(`/chat?documentId=${document.id}`)}>Ask AI</button>
				<button type="button" title="Delete document" aria-label={`Delete ${document.original_name}`} onClick={handleDelete}>Delete</button>
			</div>
		</article>
	);
}
