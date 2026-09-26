import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

export default function Register() {
	const { user, loading, register } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState({ name: "", email: "", password: "" });
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);

	if (!loading && user) return <Navigate to="/dashboard" replace />;

	async function handleSubmit(event) {
		event.preventDefault();
		setError("");
		setSubmitting(true);
		try {
			await register(form);
			navigate("/dashboard", { replace: true });
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Unable to create your account. Try again.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main className="auth-shell">
			<section className="auth-aside" aria-label="Signal AI">
				<div className="brand-lockup"><span className="brand-mark">S</span><span>SIGNAL / AI</span></div>
				<div className="aside-copy">
					<p className="eyebrow">A CLEARER WAY TO KNOW</p>
					<h1>Ideas move between code and sound.</h1>
					<p>A conversational AI assistant for technology, music, and everything in between.</p>
				</div>
					<div className="index-art" aria-hidden="true"><span>01</span><i /><i /><i /><b>TECH +<br />MUSIC</b></div>
			</section>
			<section className="auth-main">
				<div className="mobile-brand brand-lockup"><span className="brand-mark">S</span><span>SIGNAL / AI</span></div>
				<div className="auth-form-wrap">
					<p className="eyebrow">GET STARTED</p>
					<h2>Create your workspace</h2>
					<p className="form-intro">One account for the knowledge you rely on.</p>
					<form onSubmit={handleSubmit}>
						<label htmlFor="name">Full name</label>
						<input id="name" autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
						<label htmlFor="email">Email address</label>
						<input id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
						<label htmlFor="password">Password</label>
						<input id="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
						{error && <p className="form-error" role="alert">{error}</p>}
						<button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Creating account..." : "Create account"}<span aria-hidden="true">→</span></button>
					</form>
					<p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
				</div>
				<footer className="auth-footer">PRIVATE BY DESIGN <span>·</span> YOUR KNOWLEDGE STAYS YOURS</footer>
			</section>
		</main>
	);
}
