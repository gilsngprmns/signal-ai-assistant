import api from "./api.js";

async function readData(request) {
	const response = await request;
	return response.data.data;
}

export const getAdminDashboard = () => readData(api.get("/admin/dashboard"));
export const getAdminUsers = (params) => readData(api.get("/admin/users", { params }));
export const getAdminUser = (id) => readData(api.get(`/admin/users/${id}`));
export const updateAdminUser = (id, changes) => readData(api.patch(`/admin/users/${id}`, changes));
export const deleteAdminUser = (id) => readData(api.delete(`/admin/users/${id}`));
export const getAdminConversations = (params) => readData(api.get("/admin/conversations", { params }));
export const deleteAdminConversation = (id) => readData(api.delete(`/admin/conversations/${id}`));
export const getAdminContexts = (params) => readData(api.get("/admin/contexts", { params }));
export const createAdminContext = (data) => readData(api.post("/admin/contexts", data));
export const updateAdminContext = (id, data) => readData(api.patch(`/admin/contexts/${id}`, data));
export const deleteAdminContext = (id) => readData(api.delete(`/admin/contexts/${id}`));
export const getAdminSettings = () => readData(api.get("/admin/ai-settings"));
export const updateAdminSettings = (data) => readData(api.patch("/admin/ai-settings", data));
export const getAdminUsage = (params) => readData(api.get("/admin/usage", { params }));
export const getAdminActivity = (params) => readData(api.get("/admin/activity-logs", { params }));