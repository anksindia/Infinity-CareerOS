import { QueryClient } from "@tanstack/react-query";

export const getQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				gcTime: 5 * 60 * 1000, // 5 minutes
				staleTime: 60 * 1000, // 1 minute
			},
		},
	});
