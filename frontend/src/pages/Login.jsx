import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

export default function Login() {
	const { user, loading, login } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState({ email: "", password: "" });
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);

	if (!loading && user) return <Navigate to="/dashboard" replace />;

	async function handleSubmit(event) {
		event.preventDefault();
		setError("");
		setSubmitting(true);
		try {
			await login(form);
			navigate("/dashboard", { replace: true });
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Unable to sign in. Try again.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main className="auth-shell">
			<section className="auth-aside" aria-label="Signal AI">
				<div className="brand-lockup"><span className="brand-mark">S</span><span>SIGNAL / AI</span></div>
				<div className="aside-copy">
					<p className="eyebrow">YOUR WORK, WITH CONTEXT</p>
					<h1>Your space for code, systems, sound, and ideas.</h1>
					<p>A conversational AI assistant with a focus on technology and music.</p>
				</div>
					<div className="index-art" aria-hidden="true"><span>01</span><i /><i /><i /><b>TECH +<br />MUSIC</b></div>
			</section>
			<section className="auth-main">
				<div className="mobile-brand brand-lockup"><span className="brand-mark">S</span><span>SIGNAL / AI</span></div>
				<div className="auth-form-wrap">
					<p className="eyebrow">WELCOME BACK</p>
					<h2>Sign in to your workspace</h2>
					<p className="form-intro">Pick up an idea, solve a problem, or start something new.</p>
					<form onSubmit={handleSubmit}>
						<label htmlFor="email">Email address</label>
						<input id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
						<div className="field-heading"><label htmlFor="password">Password</label></div>
						<input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
						{error && <p className="form-error" role="alert">{error}</p>}
						<button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}<span aria-hidden="true">→</span></button>
					</form>
					<p className="auth-switch">New to Signal AI? <Link to="/register">Create an account</Link></p>
				</div>
				<footer className="auth-footer">PRIVATE BY DESIGN <span>·</span> YOUR KNOWLEDGE STAYS YOURS</footer>
			</section>
		</main>
	);
}
