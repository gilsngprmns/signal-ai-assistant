import { useEffect } from "react";

export default function useVisualViewportHeight() {
	useEffect(() => {
		const viewport = window.visualViewport;
		const updateHeight = () => {
			document.documentElement.style.setProperty(
				"--app-visual-height",
				`${viewport?.height ?? window.innerHeight}px`,
			);
		};
		updateHeight();
		viewport?.addEventListener("resize", updateHeight);
		window.addEventListener("resize", updateHeight);
		return () => {
			viewport?.removeEventListener("resize", updateHeight);
			window.removeEventListener("resize", updateHeight);
			document.documentElement.style.removeProperty("--app-visual-height");
		};
	}, []);
}
