import useAuth from "../hooks/useAuth.js";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Navbar({ onMenuClick }) {
	const { user } = useAuth();
	return (
		<header className="workspace-topbar">
			<button className="sidebar-toggle" type="button" onClick={onMenuClick} aria-label="Open navigation">☰</button>
			<div className="topbar-mobile-brand brand-lockup"><span className="brand-mark">S</span><span>SIGNAL <i>/</i> AI</span></div>
			<span className="topbar-greeting">Your AI space <span>/</span> {user?.name}</span>
			<ThemeToggle />
		</header>
	);
}
