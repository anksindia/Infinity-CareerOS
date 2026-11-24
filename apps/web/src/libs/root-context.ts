import type { QueryClient } from "@tanstack/react-query";
import { getLocale, loadLocale } from "./locale";
import { getTheme } from "./theme";

// The app is local-only: no authentication, no server feature flags.
export async function loadRootContext(_queryClient?: QueryClient) {
	const theme = getTheme();
	const locale = getLocale();
	await loadLocale(locale);

	return {
		theme,
		locale,
	};
}
