import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import useVisualViewportHeight from "../hooks/useVisualViewportHeight.js";

export default function DashboardLayout() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	useVisualViewportHeight();

	useEffect(() => {
		if (!sidebarOpen) return undefined;
		const previousOverflow = document.body.style.overflow;
		const previousFocus = document.activeElement;
		document.body.style.overflow = "hidden";
		const drawer = document.getElementById("user-navigation");
		const getFocusable = () => [...(drawer?.querySelectorAll("a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)") ?? [])]
			.filter((element) => element.getClientRects().length > 0);
		getFocusable()[0]?.focus();
		function handleDrawerKeys(event) {
			if (event.key === "Escape") { setSidebarOpen(false); return; }
			if (event.key !== "Tab") return;
			const elements = getFocusable();
			const first = elements[0];
			const last = elements.at(-1);
			if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
			else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
		}
		document.addEventListener("keydown", handleDrawerKeys);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", handleDrawerKeys);
			if (previousFocus instanceof HTMLElement) previousFocus.focus();
		};
	}, [sidebarOpen]);

	return (
		<div className={`app-shell${sidebarOpen ? " sidebar-open" : ""}`}>
			<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
			<div className="workspace-main">
				<Navbar onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
				<Outlet />
			</div>
		</div>
	);
}
