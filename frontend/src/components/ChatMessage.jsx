import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import WaveformLogo from "./WaveformLogo.jsx";
import "highlight.js/styles/github-dark-dimmed.css";

function readCodeText(node) {
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(readCodeText).join("");
	if (node?.props?.children !== undefined) return readCodeText(node.props.children);
	return "";
}

function MarkdownCode({ className = "", children, ...props }) {
	const language = className.match(/language-([\w-]+)/)?.[1] || "code";
	const [copied, setCopied] = useState(false);
	if (!className.includes("language-")) return <code className={className} {...props}>{children}</code>;

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(readCodeText(children).replace(/\n$/, ""));
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1400);
		} catch {
			setCopied(false);
		}
	}

	return (
		<div className="code-frame">
			<div className="code-toolbar"><span>{language}</span><button type="button" onClick={copyCode}>{copied ? "Copied" : "Copy"}</button></div>
			<pre><code className={className} {...props}>{children}</code></pre>
		</div>
	);
}

function ChatMessage({ message, onRegenerate, regenerating = false, streaming = false }) {
	const [copied, setCopied] = useState(false);
	const sources = Array.isArray(message.sources) ? message.sources : [];
	const isAssistant = message.role === "assistant";

	async function copyResponse() {
		try {
			await navigator.clipboard.writeText(message.content);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1400);
		} catch {
			setCopied(false);
		}
	}

	return (
		<article className={`chat-message ${message.role}`}>
			<div className="message-role-row">{isAssistant && <WaveformLogo className="message-waveform" />}<span className="message-role">{isAssistant ? "Signal AI" : "You"}</span>{isAssistant && <span className="message-model">AI</span>}</div>
			{isAssistant ? (
				<div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{
					code: MarkdownCode,
					table: ({ node, ...props }) => <div className="markdown-table-wrap"><table {...props} /></div>,
				}}>
					{message.content}
				</ReactMarkdown></div>
			) : <p className="user-message-content">{message.content}</p>}
			{sources.length > 0 && <div className="source-list"><span className="source-heading">SOURCES</span>{sources.map((source, index) => <div className="source-item" key={`${source.documentId}-${source.chunkIndex}-${index}`}><span>{source.documentName}</span>{source.pageNumber != null && <small>Page {source.pageNumber}</small>}</div>)}</div>}
			{isAssistant && !streaming && <div className="message-actions"><button type="button" onClick={copyResponse}>{copied ? "Copied" : "Copy"}</button>{onRegenerate && <button type="button" onClick={onRegenerate} disabled={regenerating}>{regenerating ? "Retrying..." : "Regenerate"}</button>}</div>}
		</article>
	);
}

export default memo(ChatMessage);
