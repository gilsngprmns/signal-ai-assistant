import { createContext, useEffect, useState } from "react";
import { getCurrentUser, login as loginRequest, register as registerRequest } from "../services/auth.service.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		const token = localStorage.getItem("token");

		if (!token) {
			setLoading(false);
			return () => { active = false; };
		}

		getCurrentUser()
			.then((currentUser) => {
				if (active) setUser(currentUser);
			})
			.catch(() => {
				localStorage.removeItem("token");
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => { active = false; };
	}, []);

	async function login(credentials) {
		const data = await loginRequest(credentials);
		localStorage.setItem("token", data.token);
		setUser(data.user);
		return data.user;
	}

	async function register(details) {
		const data = await registerRequest(details);
		localStorage.setItem("token", data.token);
		setUser(data.user);
		return data.user;
	}

	function logout() {
		localStorage.removeItem("token");
		setUser(null);
	}

	return (
		<AuthContext.Provider value={{ user, loading, login, register, logout }}>
			{children}
		</AuthContext.Provider>
	);
}
