import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	createConversation,
	getChatConfig,
	getConversation,
	regenerateMessage,
	streamConversationMessage,
	updateConversation,
} from "../services/chat.service.js";
import ChatMessage from "../components/ChatMessage.jsx";
import WaveformLogo from "../components/WaveformLogo.jsx";

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
	const transcriptRef = useRef(null);
	const shouldFollowRef = useRef(true);
	const [showJumpToLatest, setShowJumpToLatest] = useState(false);
	const sendingRef = useRef(false);
	const abortControllerRef = useRef(null);
	const streamTextRef = useRef("");
	const streamFlushTimerRef = useRef(null);
	const skipNextConversationLoadRef = useRef(null);

	useEffect(() => {
		if (conversationId || searchParams.has("mode")) return;
		let active = true;
		getChatConfig().then((config) => { if (active) setMode(config.defaultMode || "general"); }).catch(() => {});
		return () => { active = false; };
	}, [conversationId, searchParams]);

	useEffect(() => {
		if (!conversationId) {
			setConversation(null);
			setMessages([]);
			setMode(searchParams.get("mode") || "general");
			return;
		}
		if (skipNextConversationLoadRef.current === conversationId) {
			skipNextConversationLoadRef.current = null;
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

	useEffect(() => {
		if (shouldFollowRef.current) bottomRef.current?.scrollIntoView({ behavior: sending ? "auto" : "smooth", block: "end" });
		else if (sending) setShowJumpToLatest(true);
	}, [messages, sending]);
	useEffect(() => () => {
		clearTimeout(streamFlushTimerRef.current);
		abortControllerRef.current?.abort();
	}, []);

	function flushStreamText() {
		clearTimeout(streamFlushTimerRef.current);
		streamFlushTimerRef.current = null;
		const content = streamTextRef.current;
		setMessages((current) => current.map((message) => message.streaming ? { ...message, content } : message));
	}

	function bufferStreamText(chunk) {
		streamTextRef.current += chunk;
		if (!streamFlushTimerRef.current) streamFlushTimerRef.current = window.setTimeout(flushStreamText, 40);
	}

	function handleTranscriptScroll(event) {
		const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
		const atBottom = scrollHeight - scrollTop - clientHeight < 96;
		shouldFollowRef.current = atBottom;
		if (atBottom) setShowJumpToLatest(false);
	}

	function jumpToLatest() {
		shouldFollowRef.current = true;
		setShowJumpToLatest(false);
		bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}

	async function submitText(rawText) {
		const text = rawText.trim();
		if (!text || sendingRef.current) return;
		setError("");
		sendingRef.current = true;
		setSending(true);
		let activeConversationId = conversationId;
		const clientMessageId = crypto.randomUUID();
		const localMessageId = `local-${clientMessageId}`;
		const controller = new AbortController();
		abortControllerRef.current = controller;
		streamTextRef.current = "";
		try {
			if (!activeConversationId) {
				const created = await createConversation(mode);
				activeConversationId = String(created.id);
				setConversation(created);
				skipNextConversationLoadRef.current = activeConversationId;
				setSearchParams({ conversationId: activeConversationId });
			}
			setMessages((current) => [...current, { id: localMessageId, role: "user", content: text, sources: [], pending: true }, { id: `stream-${clientMessageId}`, role: "assistant", content: "", sources: [], streaming: true }]);
			setQuestion("");
			const result = await streamConversationMessage(activeConversationId, text, {
				clientMessageId,
				signal: controller.signal,
				onStart: ({ userMessage }) => setMessages((current) => current.map((message) => message.id === localMessageId ? userMessage : message)),
				onChunk: bufferStreamText,
			});
			flushStreamText();
			setMessages((current) => current.map((message) => message.id === localMessageId || message.pending ? result.userMessage : message.streaming ? result.assistantMessage : message));
			setConversation((current) => current ? { ...current, id: result.conversationId, mode } : current);
			const normalizedTitle = text.replace(/\s+/g, " ").trim();
			const title = normalizedTitle.length > 52 ? `${normalizedTitle.slice(0, 49).trimEnd()}...` : normalizedTitle;
			setConversation((current) => current ? { ...current, title } : current);
		} catch (requestError) {
			if (controller.signal.aborted) setError("Generation stopped. The unfinished response was not saved.");
			else setError(requestError.response?.data?.message || requestError.message || "Your question could not be answered. Try again.");
			clearTimeout(streamFlushTimerRef.current);
			streamFlushTimerRef.current = null;
			streamTextRef.current = "";
			setMessages((current) => current.filter((message) => !message.streaming));
			if (activeConversationId) {
				getConversation(activeConversationId).then((result) => {
					setConversation(result);
					setMessages(Array.isArray(result.messages) ? result.messages : []);
				}).catch(() => {});
			}
		} finally {
			sendingRef.current = false;
			abortControllerRef.current = null;
			setSending(false);
		}
	}

	function stopGeneration() {
		abortControllerRef.current?.abort();
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
				<div><h1>{messages.length ? conversation?.title || "Conversation" : "New conversation"}</h1></div>
				<div className="chat-heading-actions"><span className={`mode-indicator mode-${mode}`}>{modeLabel}</span><select className="chat-mode-select" aria-label="Conversation mode" value={mode} onChange={(event) => handleModeChange(event.target.value)}><option value="general">General</option><option value="it">IT</option><option value="music">Music</option></select><button className="chat-more-button" type="button" onClick={startNewChat} aria-label="Start a new conversation" title="New conversation">•••</button></div>
			</header>
			<div className="mode-switch" role="group" aria-label="Conversation mode">
				{modes.map((item) => <button key={item.id} type="button" className={mode === item.id ? "selected" : ""} onClick={() => handleModeChange(item.id)}>{item.label}</button>)}
			</div>
			<section className="chat-transcript" aria-live="polite" ref={transcriptRef} onScroll={handleTranscriptScroll}>
				{loadingConversation ? <div className="chat-loading-state" role="status"><span className="loading-spinner" />Opening conversation</div> : !messages.length && <div className="chat-empty"><WaveformLogo className="chat-empty-waveform" /><h2>What can I help you with?</h2><p>Ask about technology, music, or anything else.</p><div className="suggestion-grid">{suggestions[mode].slice(0, 4).map((prompt) => <button type="button" key={prompt} onClick={() => submitText(prompt)}>{prompt}<span aria-hidden="true">↗</span></button>)}</div></div>}
				{messages.map((message, index) => (
					<ChatMessage
						message={message}
						key={`${message.id ?? message.role}-${index}`}
						onRegenerate={message.role === "assistant" && index === messages.findLastIndex((item) => item.role === "assistant") ? handleRegenerate : undefined}
						regenerating={regenerating}
						streaming={message.streaming}
					/>
				))}
				{sending && !messages.some((message) => message.streaming && message.content) && <div className="answer-loading" role="status"><span className="loading-dot" /> Signal AI is generating</div>}
				{showJumpToLatest && <button className="jump-to-latest" type="button" onClick={jumpToLatest}>↓ Jump to latest</button>}
				<div ref={bottomRef} />
			</section>
			{error && <p className="notice-error chat-error" role="alert">{error}</p>}
			<form className="chat-composer" onSubmit={handleSubmit}>
				<textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder="Ask about tech, music, or anything else..." aria-label="Your message" maxLength={12000} rows={2} />
				{sending ? <button className="stop-generation-button" type="button" onClick={stopGeneration} aria-label="Stop generating" title="Stop generating">■</button> : <button type="submit" disabled={!question.trim()} aria-label="Send message" title="Send message">↑</button>}
				<span className="composer-hint">{modeLabel} mode <span>·</span> Enter to send <span>·</span> Shift+Enter for a new line</span>
			</form>
		</main>
	);
}
