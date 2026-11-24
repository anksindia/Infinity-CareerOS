import { createFileRoute } from "@tanstack/react-router";
import { LocalLibrary } from "@/features/local-builder/library";

// An instance's root resume (`ROOT_RESUME_ID`) is served by the server as a web page; the app only shows the home.
export const Route = createFileRoute("/_home/")({
	component: LocalLibrary,
});
