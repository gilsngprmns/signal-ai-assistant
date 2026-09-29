import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import WaveformLogo from "../components/WaveformLogo.jsx";
import EqualizerArtwork from "../components/EqualizerArtwork.jsx";

export default function Login() {
	const { user, loading, login } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState({ email: "", password: "" });
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	if (!loading && user) return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/app/chat"} replace />;

	async function handleSubmit(event) {
		event.preventDefault();
		setError("");
		setSubmitting(true);
		try {
			const signedInUser = await login(form);
			navigate(signedInUser.role === "admin" ? "/admin/dashboard" : "/app/chat", { replace: true });
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Unable to sign in. Try again.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main className="auth-shell login-shell">
			<section className="auth-aside login-showcase" aria-label="Signal AI">
				<div className="brand-lockup"><WaveformLogo className="showcase-waveform" /><span>Signal <b>AI</b></span></div>
				<div className="login-showcase-body">
					<p className="login-kicker"><span /> TECHNOLOGY <i>×</i> MUSIC <i>×</i> CONVERSATION</p>
					<h1>Ideas move<br />at your frequency.</h1>
					<p className="login-showcase-copy">A thoughtful space for the things you build, hear, and wonder about.</p>
					<div className="login-benefits">
						<div className="login-benefit"><span className="login-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 10h8M8 14h5" /><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z" /></svg></span><span><strong>Natural conversations</strong><small>Clear answers that keep the thread.</small></span></div>
						<div className="login-benefit"><span className="login-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5" /></svg></span><span><strong>Multiple perspectives</strong><small>Move between tech, music, and more.</small></span></div>
						<div className="login-benefit"><span className="login-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 2 5 13h6l-1 9 9-12h-6l1-8Z" /></svg></span><span><strong>Made for getting things done</strong><small>Your conversations stay easy to return to.</small></span></div>
					</div>
				</div>
				<EqualizerArtwork />
				<div className="login-showcase-foot"><span>Signal AI</span><span>YOUR IDEAS, IN GOOD COMPANY</span></div>
			</section>
			<section className="auth-main login-panel">
				<div className="mobile-brand brand-lockup"><WaveformLogo /><span>Signal AI</span></div>
				<div className="auth-form-wrap login-form-card">
					<p className="eyebrow">WELCOME BACK</p>
					<h2>Sign in to continue</h2>
					<p className="form-intro">Pick up where your ideas left off.</p>
					<form onSubmit={handleSubmit}>
						<label htmlFor="email">Email</label>
						<div className="login-input-wrap">
							<svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="m4.5 7 7.5 6 7.5-6" /></svg>
							<input id="email" type="email" autoComplete="email" placeholder="you@example.com" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
						</div>
						<label htmlFor="password">Password</label>
						<div className="login-input-wrap">
							<svg className="login-input-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
							<input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
							<button className="password-visibility" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
								{showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 6.2A10.4 10.4 0 0 1 12 6c6.2 0 9.5 6 9.5 6a15.7 15.7 0 0 1-3.1 3.7M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.3 6 9.5 6c1.1 0 2.1-.2 3-.5" /></svg>}
							</button>
						</div>
						{error && <p className="form-error" role="alert">{error}</p>}
						<button className="primary-button login-submit" type="submit" disabled={submitting}><span>{submitting ? "Signing in" : "Sign in"}</span><span className={submitting ? "login-submit-spinner" : "login-submit-arrow"} aria-hidden="true">{submitting ? "" : "→"}</span></button>
					</form>
					<div className="login-divider"><span>or</span></div>
					<Link className="login-create-account" to="/register"><span aria-hidden="true">＋</span>Create a new account</Link>
					<p className="login-privacy-note">Your conversations stay yours.</p>
				</div>
				<footer className="auth-footer login-footer">PRIVATE BY DESIGN <span>·</span> YOUR KNOWLEDGE STAYS YOURS</footer>
			</section>
		</main>
	);
}
