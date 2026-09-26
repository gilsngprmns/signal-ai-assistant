import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

export default function ProtectedRoute() {
	const { user, loading } = useAuth();

	if (loading) {
		return <main className="auth-loading" aria-label="Loading account">Loading...</main>;
	}
	return user ? <Outlet /> : <Navigate to="/login" replace />;
}
