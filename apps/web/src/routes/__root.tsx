import type { Theme } from "@/libs/theme";
import type { IconProps } from "@phosphor-icons/react";
import type { Locale } from "@reactive-resume/utils/locale";
import type { QueryClient } from "@tanstack/react-query";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { i18n } from "@lingui/core";
import { t } from "@lingui/core/macro";
import { I18nProvider, useLingui } from "@lingui/react";
import { IconContext } from "@phosphor-icons/react";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet } from "@tanstack/react-router";
import { LazyMotion, MotionConfig } from "motion/react";
import { useEffect } from "react";
import { Toaster } from "@reactive-resume/ui/components/toast";
import { TooltipProvider } from "@reactive-resume/ui/components/tooltip";
import { isRTL } from "@reactive-resume/utils/locale";
import { ThemeProvider } from "@/features/theme/provider";
import { ConfirmDialogProvider } from "@/hooks/use-confirm";
import { loadRootContext } from "@/libs/root-context";
import { getHomepageMeta } from "@/libs/seo";

type RouterContext = {
	theme: Theme;
	locale: Locale;
	queryClient: QueryClient;
};

const iconContextValue: IconProps = { size: 16, weight: "regular" };

// Requested now, while the route loads, so animations are ready by the first render without blocking it.
const motionFeatures = import("@/libs/motion-features").then((module) => module.default);
const loadMotionFeatures = () => motionFeatures;

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
	// The Next.js document carries the tags that never change (charset, viewport, icons, manifest); the server adds each page's
	// canonical link, social cards and structured data. The router only keeps the title and description current.
	head: () => {
		const { title, description } = getHomepageMeta();
		return { meta: [{ title }, { name: "description", content: description }] };
	},
	beforeLoad: () => loadRootContext(),
});

function RootComponent() {
	const { theme, locale, queryClient } = Route.useRouteContext();
	const dir = isRTL(locale) ? "rtl" : "ltr";

	// The theme class is owned by ThemeProvider, which also follows the system appearance.
	useEffect(() => {
		document.documentElement.lang = locale;
		document.documentElement.dir = dir;
	}, [dir, locale]);

	return (
		<>
			<HeadContent />

			<QueryClientProvider client={queryClient}>
				<MotionConfig reducedMotion="user">
					<LazyMotion features={loadMotionFeatures}>
						<I18nProvider i18n={i18n}>
							<IconContext.Provider value={iconContextValue}>
								<ThemeProvider theme={theme}>
									<HotkeysProvider>
										<DirectionProvider direction={dir}>
											<TooltipProvider>
												<ConfirmDialogProvider>
													<Outlet />

													<LocalizedToaster />
												</ConfirmDialogProvider>
											</TooltipProvider>
										</DirectionProvider>
									</HotkeysProvider>
								</ThemeProvider>
							</IconContext.Provider>
						</I18nProvider>
					</LazyMotion>
				</MotionConfig>
			</QueryClientProvider>
		</>
	);
}

function LocalizedToaster() {
	useLingui();
	return <Toaster closeLabel={t`Close notification`} />;
}
