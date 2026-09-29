import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { createConversation, getChatConfig, getConversations } from "../services/chat.service.js";
import WaveformLogo from "./WaveformLogo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

const modes = [
	{ id: "general", label: "General", mark: "◌" },
	{ id: "it", label: "IT", mark: "⌘" },
	{ id: "music", label: "Music", mark: "♫" },
];

export default function Sidebar({ open, onClose }) {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [conversations, setConversations] = useState([]);
	const [defaultMode, setDefaultMode] = useState("general");
	const [error, setError] = useState("");

	const refresh = useCallback(async () => {
		try {
			setConversations(await getConversations());
			setError("");
		} catch {
			setError("Recent chats unavailable");
		}
	}, []);

	useEffect(() => { refresh(); }, [refresh, location.pathname, location.search]);
	useEffect(() => { getChatConfig().then((config) => setDefaultMode(config.defaultMode)).catch(() => {}); }, []);

	async function startChat(mode = defaultMode) {
		try {
			const conversation = await createConversation(mode);
			navigate(`/app/chat?conversationId=${conversation.id}`);
			onClose();
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Could not start a chat");
		}
	}

	function signOut() {
		logout();
		navigate("/login", { replace: true });
	}

	return (
		<>
			{open && <button className="sidebar-scrim" type="button" aria-label="Close sidebar" onClick={onClose} />}
			<aside className={`sidebar${open ? " sidebar-open" : ""}`} id="user-navigation" aria-label="User navigation">
				<div className="user-drawer-brand-row"><div className="brand-lockup sidebar-brand"><WaveformLogo /><span>Signal AI</span></div><button className="user-drawer-close" type="button" aria-label="Close navigation" onClick={onClose}>×</button></div>
				<button className="new-chat-button" type="button" onClick={() => startChat()}><span aria-hidden="true">＋</span> New chat</button>
				<p className="sidebar-caption">START IN A MODE</p>
				<nav className="mode-nav" aria-label="Chat modes">
					{modes.map((mode) => (
						<button className="mode-link" type="button" key={mode.id} onClick={() => startChat(mode.id)}>
							<span className="nav-mark" aria-hidden="true">{mode.mark}</span>{mode.label}
						</button>
					))}
				</nav>
				<div className="recent-heading"><p className="sidebar-caption">RECENT CHATS</p><Link to="/app/history" onClick={onClose}>All</Link></div>
				<nav className="recent-nav" aria-label="Recent conversations">
					{conversations.slice(0, 9).map((conversation) => (
						<Link
							className={`recent-chat${String(conversation.id) === new URLSearchParams(location.search).get("conversationId") ? " active" : ""}`}
							key={conversation.id}
							to={`/app/chat?conversationId=${conversation.id}`}
							onClick={onClose}
						>
							<span className={`mode-dot mode-${conversation.mode || "general"}`} />
							<span>{conversation.title}</span>
						</Link>
						))}
					{!conversations.length && <p className="sidebar-empty">Your chats appear here.</p>}
				</nav>
				{error && <p className="sidebar-error" role="status">{error}</p>}
				<div className="sidebar-account">
					<div className="account-avatar">{user?.name?.trim()?.[0]?.toUpperCase() || "U"}</div>
					<Link to="/app/profile" className="account-copy" onClick={onClose}><strong>{user?.name || "Account"}</strong><small>{user?.email}</small></Link>
					<button type="button" title="Sign out" aria-label="Sign out" onClick={signOut}>↗</button>
				</div>
				<div className="sidebar-drawer-tools">
					<Link to="/app/profile" onClick={onClose}>Profile</Link>
					<span>Appearance</span><ThemeToggle />
					<button type="button" className="sidebar-sign-out" onClick={signOut}>Sign out</button>
				</div>
			</aside>
		</>
	);
}
