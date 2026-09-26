import { getCurrentUser, login, register } from "../services/auth.service.js";
import { validateLogin, validateRegistration } from "../validators/auth.validator.js";

export async function registerUser(req, res, next) {
	const validation = validateRegistration(req.body);
	if (validation.error) {
		return res.status(400).json({ success: false, message: validation.error });
	}

	try {
		const data = await register(validation.value);
		return res.status(201).json({ success: true, message: "Account created", data });
	} catch (error) {
		return next(error);
	}
}

export async function loginUser(req, res, next) {
	const validation = validateLogin(req.body);
	if (validation.error) {
		return res.status(400).json({ success: false, message: validation.error });
	}

	try {
		const data = await login(validation.value);
		return res.json({ success: true, message: "Logged in", data });
	} catch (error) {
		return next(error);
	}
}

export async function getMe(req, res, next) {
	try {
		const user = await getCurrentUser(req.user.id);
		return res.json({ success: true, data: user });
	} catch (error) {
		return next(error);
	}
}
