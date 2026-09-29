export async function uploadDocument() {
	throw new Error("Legacy document upload is disabled in this backend build.");
}

export async function getDocuments() {
	return [];
}

export async function getDocument() {
	return null;
}

export async function getDocumentFile() {
	return null;
}

export async function removeDocument() {
	return false;
}
