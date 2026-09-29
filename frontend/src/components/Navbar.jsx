import useAuth from "../hooks/useAuth.js";
import ThemeToggle from "./ThemeToggle.jsx";
import WaveformLogo from "./WaveformLogo.jsx";

export default function Navbar({ onMenuClick, sidebarOpen = false }) {
	const { user } = useAuth();
	return (
		<header className="workspace-topbar">
			<button className="sidebar-toggle" type="button" onClick={onMenuClick} aria-label="Open navigation" aria-controls="user-navigation" aria-expanded={sidebarOpen}>☰</button>
			<div className="topbar-mobile-brand brand-lockup"><WaveformLogo /><span>Signal AI</span></div>
			<span className="topbar-greeting">Your AI space <span>/</span> {user?.name}</span>
			<ThemeToggle />
		</header>
	);
}
