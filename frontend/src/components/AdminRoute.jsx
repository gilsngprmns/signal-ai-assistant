import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

export default function AdminRoute() {
	const { user } = useAuth();
	return user?.role === "admin" ? <Outlet /> : <Navigate to="/app" replace />;
}