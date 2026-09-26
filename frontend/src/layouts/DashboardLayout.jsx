import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";

export default function DashboardLayout() {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className={`app-shell${sidebarOpen ? " sidebar-open" : ""}`}>
			<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
			<div className="workspace-main">
				<Navbar onMenuClick={() => setSidebarOpen(true)} />
				<Outlet />
			</div>
		</div>
	);
}
