import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { followReducedMotion } from "./libs/motion";
import { getRouter } from "./router";

export async function mountApp() {
	const rootElement = document.getElementById("app");
	if (!rootElement) throw new Error("Root element not found");

	followReducedMotion();

	const router = await getRouter();

	// TanStack manages the title, description and robots tags after boot. Keep the server's canonical, hreflang,
	// social cards and structured data.
	document.head.querySelectorAll('title, meta[name="description"], meta[name="robots"]').forEach((element) => {
		element.remove();
	});

	// Keep the prerendered page visible until the first route is ready.
	if (rootElement.hasChildNodes()) await router.load();

	ReactDOM.createRoot(rootElement).render(<RouterProvider router={router} />);
}
