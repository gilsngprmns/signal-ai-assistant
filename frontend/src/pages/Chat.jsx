import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	createConversation,
	getConversation,
	regenerateMessage,
	sendConversationMessage,
	updateConversation,
} from "../services/chat.service.js";
import ChatMessage from "../components/ChatMessage.jsx";

const modes = [
	{ id: "general", label: "General" },
	{ id: "it", label: "IT" },
	{ id: "music", label: "Music" },
];

const suggestions = {
	general: [
		"Explain something complicated in simple terms",
		"Help me brainstorm an idea",
	],
	it: [
		"My laptop is slow. What should I check first?",
		"Explain REST API like I'm a beginner",
		"Help me debug an HTTP 500 error",
		"What's the difference between frontend and backend?",
	],
	music: [
		"How do I build a dreamy shoegaze guitar tone?",
		"What's the difference between fuzz and distortion?",
		"Help me layer guitars without making the mix muddy",
		"How should I start mixing shoegaze vocals?",
	],
};

export default function Chat() {
	const [searchParams, setSearchParams] = useSearchParams();
	const conversationId = searchParams.get("conversationId");
	const [messages, setMessages] = useState([]);
	const [conversation, setConversation] = useState(null);
	const [mode, setMode] = useState(searchParams.get("mode") || "general");
	const [question, setQuestion] = useState("");
	const [loadingConversation, setLoadingConversation] = useState(false);
	const [sending, setSending] = useState(false);
	const [regenerating, setRegenerating] = useState(false);
	const [error, setError] = useState("");
	const bottomRef = useRef(null);

	useEffect(() => {
		if (!conversationId) {
			setConversation(null);
			setMessages([]);
			setMode(searchParams.get("mode") || "general");
			return;
		}
		let active = true;
		setLoadingConversation(true);
		setError("");
		getConversation(conversationId)
			.then((result) => {
				if (!active) return;
				setConversation(result);
				setMode(result.mode || "general");
				setMessages(Array.isArray(result.messages) ? result.messages : []);
			})
			.catch((requestError) => setError(requestError.response?.data?.message || "Conversation could not be opened"))
			.finally(() => { if (active) setLoadingConversation(false); });
		return () => { active = false; };
	}, [conversationId, searchParams]);

	useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

	async function submitText(rawText) {
		const text = rawText.trim();
		if (!text || sending) return;
		setError("");
		setSending(true);
		let activeConversationId = conversationId;
		try {
			if (!activeConversationId) {
				const created = await createConversation(mode);
				activeConversationId = String(created.id);
				setConversation(created);
				setSearchParams({ conversationId: activeConversationId });
			}
			const result = await sendConversationMessage(activeConversationId, text);
			setMessages((current) => [
				...current.filter((message) => !message.pending),
				result.userMessage,
				result.assistantMessage,
			]);
			setConversation((current) => current ? { ...current, id: result.conversationId, mode } : current);
			setQuestion("");
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Your question could not be answered. Try again.");
			if (activeConversationId) {
				getConversation(activeConversationId).then((result) => {
					setConversation(result);
					setMessages(Array.isArray(result.messages) ? result.messages : []);
				}).catch(() => {});
			}
		} finally {
			setSending(false);
		}
	}

	async function handleSubmit(event) {
		event.preventDefault();
		await submitText(question);
	}

	async function handleModeChange(nextMode) {
		setError("");
		if (!conversationId) {
			setMode(nextMode);
			setSearchParams({ mode: nextMode });
			return;
		}
		try {
			const updated = await updateConversation(conversationId, { mode: nextMode });
			setConversation(updated);
			setMode(updated.mode);
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Chat mode could not be changed");
		}
	}

	function startNewChat() {
		setConversation(null);
		setMessages([]);
		setError("");
		setSearchParams({ mode });
	}

	async function handleRegenerate() {
		if (!conversationId || regenerating) return;
		setRegenerating(true);
		setError("");
		try {
			const result = await regenerateMessage(conversationId);
			setMessages((current) => {
				const assistantIndex = current.findLastIndex((message) => message.role === "assistant");
				if (assistantIndex < 0) return [...current, result.assistantMessage];
				return current.map((message, index) => index === assistantIndex ? result.assistantMessage : message);
			});
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Response could not be regenerated");
		} finally {
			setRegenerating(false);
		}
	}

	const modeLabel = modes.find((item) => item.id === mode)?.label || "General";

	return (
		<main className="chat-page">
			<header className="chat-heading">
				<div><p className="eyebrow">CODE · SYSTEMS · SOUND · IDEAS</p><h1>{messages.length ? conversation?.title || "Conversation" : "What's on your mind?"}</h1></div>
				<div className="chat-heading-actions"><span className={`mode-indicator mode-${mode}`}>{modeLabel} mode</span><button className="secondary-button" type="button" onClick={startNewChat}>＋ New chat</button></div>
			</header>
			<div className="mode-switch" role="group" aria-label="Conversation mode">
				{modes.map((item) => <button key={item.id} type="button" className={mode === item.id ? "selected" : ""} onClick={() => handleModeChange(item.id)}>{item.label}</button>)}
			</div>
			<section className="chat-transcript" aria-live="polite">
				{loadingConversation ? <p className="empty-line">Loading conversation...</p> : !messages.length && <div className="chat-empty"><span className="chat-empty-mark">S</span><h2>Your AI space for code, systems, sound, and ideas.</h2><p>Ask anything. Choose a focus, or keep it open.</p><div className="suggestion-grid">{suggestions[mode].map((prompt) => <button type="button" key={prompt} onClick={() => submitText(prompt)}>{prompt}<span aria-hidden="true">↗</span></button>)}</div></div>}
				{messages.map((message, index) => (
					<ChatMessage
						message={message}
						key={`${message.id ?? message.role}-${index}`}
						onRegenerate={message.role === "assistant" && index === messages.findLastIndex((item) => item.role === "assistant") ? handleRegenerate : undefined}
						regenerating={regenerating}
					/>
				))}
				{sending && <div className="answer-loading" role="status"><span className="loading-dot" /> Thinking...</div>}
				<div ref={bottomRef} />
			</section>
			{error && <p className="notice-error chat-error" role="alert">{error}</p>}
			<form className="chat-composer" onSubmit={handleSubmit}>
				<textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder={`Message Signal in ${modeLabel} mode...`} aria-label="Your message" maxLength={20000} rows={2} />
				<button type="submit" disabled={sending || !question.trim()} aria-label="Send message" title="Send message">↑</button>
				<span className="composer-hint">{modeLabel} mode <span>·</span> Enter to send <span>·</span> Shift+Enter for a new line</span>
			</form>
		</main>
	);
}
