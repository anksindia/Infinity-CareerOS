import { useEffect } from "react";

let mounting: Promise<void> | undefined;
const load = () => {
	mounting ??= import("../main").then(({ mountApp }) => mountApp());
};

export default function Home() {
	useEffect(() => {
		if (
			!document.getElementById("app")?.hasChildNodes() ||
			!globalThis.PerformanceObserver?.supportedEntryTypes.includes("paint")
		) {
			load();
			return;
		}

		// Keep the localized HTML visible while the browser paints and loads the interactive app.
		const start = () => {
			observer.disconnect();
			window.clearTimeout(timeout);
			load();
		};
		const observer = new PerformanceObserver((entries) => {
			if (entries.getEntriesByName("first-contentful-paint").length > 0) start();
		});
		const timeout = window.setTimeout(start, 3000);
		observer.observe({ type: "paint", buffered: true });

		return () => {
			observer.disconnect();
			window.clearTimeout(timeout);
		};
	}, []);

	return null;
}
