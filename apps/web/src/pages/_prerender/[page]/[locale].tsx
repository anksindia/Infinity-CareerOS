import type { GetStaticPaths, GetStaticProps } from "next";
import { isLocale } from "@reactive-resume/utils/locale";
import { isPrerenderedPage, locales, prerenderedPages, renderPage } from "@/features/homepage/prerender";

export const getStaticPaths: GetStaticPaths = () => ({
	paths: prerenderedPages.flatMap((page) => locales.map((locale) => ({ params: { page, locale } }))),
	fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
	const page = params?.page;
	const locale = params?.locale;
	if (typeof page !== "string" || !isPrerenderedPage(page) || !isLocale(locale)) return { notFound: true };

	return { props: await renderPage(page, locale) };
};

// The export script moves the rendered marketing markup into the shared application shell.
export default function PrerenderedPage() {
	return null;
}
