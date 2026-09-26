const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(body = {}) {
	const name = typeof body.name === "string" ? body.name.trim() : "";
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const password = typeof body.password === "string" ? body.password : "";

	if (!name) {
		return { error: "Name is required" };
	}
	if (!EMAIL_PATTERN.test(email)) {
		return { error: "A valid email address is required" };
	}
	if (password.length < 8) {
		return { error: "Password must be at least 8 characters" };
	}

	return { value: { name, email, password } };
}

export function validateLogin(body = {}) {
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const password = typeof body.password === "string" ? body.password : "";

	if (!EMAIL_PATTERN.test(email) || !password) {
		return { error: "Email and password are required" };
	}

	return { value: { email, password } };
}
