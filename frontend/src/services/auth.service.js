import api from "./api.js";

export async function register(details) {
	const response = await api.post("/auth/register", details);
	return response.data.data;
}

export async function login(credentials) {
	const response = await api.post("/auth/login", credentials);
	return response.data.data;
}

export async function getCurrentUser() {
	const response = await api.get("/auth/me");
	return response.data.data;
}
