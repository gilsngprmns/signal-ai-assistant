import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

export default function HomeRedirect() {
	const { user, loading } = useAuth();
	if (loading) return <main className="auth-loading" aria-label="Loading account">Loading...</main>;
	return <Navigate to={user?.role === "admin" ? "/admin/dashboard" : user ? "/app/chat" : "/login"} replace />;
}