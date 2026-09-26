import { useRef, useState } from "react";
import { uploadDocument } from "../services/document.service.js";

export default function UploadDocument({ onUploaded }) {
	const inputRef = useRef(null);
	const [dragging, setDragging] = useState(false);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	async function handleFile(file) {
		if (!file) return;
		setError("");
		setMessage("");
		const validName = /\.(pdf|docx|txt)$/i.test(file.name);
		if (!validName || file.size > 10 * 1024 * 1024) {
			setError("Choose a PDF, DOCX, or TXT file up to 10 MB.");
			return;
		}
		setBusy(true);
		try {
			await uploadDocument(file);
			setMessage(`${file.name} uploaded. Processing has started.`);
			onUploaded();
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Upload failed. Please try again.");
		} finally {
			setBusy(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	return (
		<div className={`upload-zone${dragging ? " is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]); }}>
			<input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => handleFile(event.target.files[0])} />
			<span className="upload-symbol" aria-hidden="true">↑</span>
			<div><strong>{busy ? "Uploading document..." : "Drop a document here"}</strong><p>PDF, DOCX, or TXT · maximum 10 MB</p></div>
			<button className="secondary-button" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>Browse files</button>
			{message && <p className="upload-message" role="status">{message}</p>}
			{error && <p className="form-error upload-message" role="alert">{error}</p>}
		</div>
	);
}
