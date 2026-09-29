import bcrypt from "bcryptjs";
import { createUser, findUserByEmail, findUserById, updateLastLogin } from "../repositories/user.repository.js";
import { generateToken } from "../utils/generateToken.js";

export class AuthError extends Error {
	constructor(message, statusCode) {
		super(message);
		this.statusCode = statusCode;
	}
}

export async function register({ name, email, password }) {
	const existingUser = await findUserByEmail(email);
	if (existingUser) {
		throw new AuthError("An account with this email already exists", 409);
	}

	const passwordHash = await bcrypt.hash(password, 12);
	let user;
	try {
		user = await createUser(name, email, passwordHash);
	} catch (error) {
		if (error.code === "23505") {
			throw new AuthError("An account with this email already exists", 409);
		}
		throw error;
	}

	return { user, token: generateToken(user) };
}

export async function login({ email, password }) {
	const account = await findUserByEmail(email);
	const passwordMatches = account
		? await bcrypt.compare(password, account.password_hash)
		: false;

	if (!passwordMatches) {
		throw new AuthError("Invalid email or password", 401);
	}
	if (account.status !== "active") {
		throw new AuthError("This account is suspended", 403);
	}
	await updateLastLogin(account.id);

	const user = {
		id: account.id,
		name: account.name,
		email: account.email,
		role: account.role,
		created_at: account.created_at,
	};

	return { user, token: generateToken(user) };
}

export async function getCurrentUser(id) {
	const user = await findUserById(id);
	if (!user) {
		throw new AuthError("User account no longer exists", 401);
	}
	if (user.status !== "active") {
		throw new AuthError("This account is suspended", 403);
	}
	return user;
}
