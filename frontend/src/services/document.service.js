import api from "./api.js";

export async function getDocuments() {
	const response = await api.get("/documents");
	return response.data.data;
}

export async function uploadDocument(file) {
	const formData = new FormData();
	formData.append("file", file);
	const response = await api.post("/documents", formData);
	return response.data.data;
}

export async function deleteDocument(id) {
	const response = await api.delete(`/documents/${id}`);
	return response.data;
}

export async function getDocumentFile(id) {
	const response = await api.get(`/documents/${id}/file`, { responseType: "blob" });
	return response.data;
}
