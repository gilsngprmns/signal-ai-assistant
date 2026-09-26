import { useCallback, useEffect, useState } from "react";
import DocumentCard from "../components/DocumentCard.jsx";
import UploadDocument from "../components/UploadDocument.jsx";
import { getDocuments } from "../services/document.service.js";

export default function Documents() {
	const [documents, setDocuments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const refresh = useCallback(async () => {
		setError("");
		try {
			setDocuments(await getDocuments());
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Documents could not be loaded");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { refresh(); }, [refresh]);

	return (
		<main className="workspace-content page-content">
			<div className="page-heading"><div><p className="eyebrow">YOUR LIBRARY</p><h1>Documents</h1></div><span className="count-note">{documents.length} {documents.length === 1 ? "document" : "documents"}</span></div>
			<UploadDocument onUploaded={refresh} />
			<section className="content-section document-section">
				<div className="section-heading"><div><p className="eyebrow">SOURCE MATERIAL</p><h2>All documents</h2></div></div>
				{error && <p className="notice-error" role="alert">{error}</p>}
				{loading ? <p className="empty-line">Loading documents...</p> : documents.length ? <div className="document-list">{documents.map((document) => <DocumentCard key={document.id} document={document} onDeleted={(id) => setDocuments((current) => current.filter((item) => item.id !== id))} />)}</div> : <div className="empty-state"><p>No documents yet.</p><span>Upload a PDF, DOCX, or TXT to start building your library.</span></div>}
			</section>
		</main>
	);
}
