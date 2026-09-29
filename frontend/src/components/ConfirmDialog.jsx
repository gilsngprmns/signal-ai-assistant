import { useEffect, useRef } from "react";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", busy = false, onCancel, onConfirm }) {
	const cancelRef = useRef(null);

	useEffect(() => {
		if (!open) return undefined;
		cancelRef.current?.focus();
		function closeOnEscape(event) {
			if (event.key === "Escape" && !busy) onCancel();
		}
		document.addEventListener("keydown", closeOnEscape);
		return () => document.removeEventListener("keydown", closeOnEscape);
	}, [open, busy, onCancel]);

	if (!open) return null;
	return (
		<div className="admin-modal-backdrop confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
			<section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
				<div className="confirm-dialog-copy"><h2 id="confirm-dialog-title">{title}</h2><p id="confirm-dialog-message">{message}</p></div>
				<div className="confirm-dialog-actions">
					<button ref={cancelRef} className="admin-button" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
					<button className="admin-button danger" type="button" disabled={busy} onClick={onConfirm}>{busy ? "Deleting..." : confirmLabel}</button>
				</div>
			</section>
		</div>
	);
}