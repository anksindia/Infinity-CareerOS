import { createFileRoute } from "@tanstack/react-router";
import { AtsCheckerPage } from "@/features/ats-checker/page";
import { getAtsCheckerMeta } from "@/libs/seo";

export const Route = createFileRoute("/_home/ats-checker")({
	component: RouteComponent,
	head: () => {
		const { title, description } = getAtsCheckerMeta();
		return { meta: [{ title }, { name: "description", content: description }] };
	},
});

function RouteComponent() {
	return <AtsCheckerPage />;
}
