import { useEffect, useState } from "react";

export default function ThemeToggle() {
	const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		localStorage.setItem("theme", theme);
	}, [theme]);

	const nextTheme = theme === "dark" ? "light" : "dark";
	return (
		<button
			className="theme-toggle"
			type="button"
			title={`Switch to ${nextTheme} mode`}
			aria-label={`Switch to ${nextTheme} mode`}
			onClick={() => setTheme(nextTheme)}
		>
			{theme === "dark" ? "☼" : "◐"}
		</button>
	);
}
