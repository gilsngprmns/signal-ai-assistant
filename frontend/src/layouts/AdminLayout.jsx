import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import WaveformLogo from "../components/WaveformLogo.jsx";
import useVisualViewportHeight from "../hooks/useVisualViewportHeight.js";
import "../Admin.css";

const groups = [
	{ label: "OVERVIEW", links: [["Dashboard", "/admin/dashboard", "▦"]] },
	{ label: "MANAGEMENT", links: [["Users", "/admin/users", "◎"], ["Conversations", "/admin/conversations", "☷"]] },
	{ label: "AI MANAGEMENT", links: [["Context labels", "/admin/ai-contexts", "⌘"], ["AI settings", "/admin/ai-settings", "⚙"], ["Usage", "/admin/usage", "⌁"]] },
	{ label: "SYSTEM", links: [["Activity logs", "/admin/activity-logs", "◷"]] },
];

export default function AdminLayout() {
	const [open, setOpen] = useState(false);
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	useVisualViewportHeight();

	useEffect(() => {
		if (!open) return undefined;
		const previousOverflow = document.body.style.overflow;
		const previousFocus = document.activeElement;
		document.body.style.overflow = "hidden";
		const drawer = document.querySelector(".admin-sidebar");
		const getFocusable = () => [...(drawer?.querySelectorAll("a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)") ?? [])]
			.filter((element) => element.getClientRects().length > 0);
		getFocusable()[0]?.focus();
		function handleDrawerKeys(event) {
			if (event.key === "Escape") { setOpen(false); return; }
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
	}, [open]);

	function signOut() {
		logout();
		navigate("/login", { replace: true });
	}

	return (
		<div className={`admin-shell${open ? " admin-menu-open" : ""}`}>
			{open && <button className="admin-scrim" type="button" aria-label="Close admin navigation" onClick={() => setOpen(false)} />}
			<aside className="admin-sidebar" id="admin-navigation" aria-label="Admin navigation" aria-hidden={!open && undefined}>
				<div className="admin-brand-row"><Link to="/admin/dashboard" className="admin-brand"><WaveformLogo /><span>Signal AI<small>ADMIN</small></span></Link><button className="admin-drawer-close" type="button" aria-label="Close admin navigation" onClick={() => setOpen(false)}>×</button></div>
				{groups.map((group) => <nav className="admin-nav-group" aria-label={group.label} key={group.label}>
					<p>{group.label}</p>
					{group.links.map(([label, path, mark]) => <NavLink to={path} key={path} onClick={() => setOpen(false)} className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
						<span aria-hidden="true">{mark}</span>{label}
					</NavLink>)}
				</nav>)}
				<div className="admin-sidebar-bottom">
					<Link className="admin-open-chat" to="/app/chat">↗ <span>Open user chat</span></Link>
					<div className="admin-account"><span className="admin-avatar">{user?.name?.[0]?.toUpperCase() || "A"}</span><Link to="/app/profile" className="admin-account-copy"><strong>{user?.name || "Administrator"}</strong><small>Admin profile</small></Link><button type="button" title="Sign out" aria-label="Sign out" onClick={signOut}>↗</button></div>
				</div>
			</aside>
			<div className="admin-main">
				<header className="admin-topbar"><button className="admin-menu-toggle" aria-controls="admin-navigation" aria-expanded={open} onClick={() => setOpen(true)} aria-label="Open admin navigation">☰</button><div><span>Signal AI</span><b>/</b> Administration</div><span className="admin-topbar-user">{user?.email}</span></header>
				<Outlet />
			</div>
		</div>
	);
}