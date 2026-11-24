import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";
import { LocalEditor } from "@/features/local-builder/editor";
import { getLocalResume } from "@/features/local-builder/storage";
import { EDITOR_MODES } from "@/features/resume/editor/store";

const searchSchema = z.object({
	// Write is the default and stays out of the URL.
	mode: z.enum(EDITOR_MODES).optional().catch(undefined),
	// Opens History on this version, read-only; Applications' "Open" on what was sent links here.
	version: z.string().optional().catch(undefined),
	// Opens the assistant on a conversation ("new" for a fresh one).
	assistant: z.string().optional().catch(undefined),
	// Fills the assistant's composer. Never sent without the user pressing Send: anyone can make a link.
	ask: z.string().max(2_000).optional().catch(undefined),
	// Prepare for next step keeps the application clicked, even when a base resume serves several jobs.
	applicationId: z.string().optional().catch(undefined),
	// The file a resume was just imported from; Write says what came in until it's dismissed.
	imported: z.string().max(255).optional().catch(undefined),
	letter: z
		.union([z.literal("all"), z.uuid()])
		.optional()
		.catch(undefined),
});

export const Route = createFileRoute("/builder/$resumeId")({
	component: RouteComponent,
	validateSearch: searchSchema,
	beforeLoad: ({ params }) => {
		if (!getLocalResume(params.resumeId)) throw redirect({ to: "/" });
	},
});

function RouteComponent() {
	const { resumeId } = Route.useParams();
	const { letter } = Route.useSearch();
	return <LocalEditor key={resumeId} resumeId={resumeId} letterId={letter} />;
}
