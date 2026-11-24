import { Head, Html, Main, NextScript } from "next/document";

const bootstrap = `
	try {
		const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
		const theme = match ? decodeURIComponent(match[1]) : "system";
		const dark = theme === "dark" || (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
		document.documentElement.classList.toggle("dark", dark);
	} catch {
		// The theme provider picks up the preference when the app loads.
	}
	globalThis.__zod_globalConfig = { jitless: true };
`;

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<meta name="theme-color" content="#F8F7F3" media="(prefers-color-scheme: light)" />
				<meta name="theme-color" content="#100F0C" media="(prefers-color-scheme: dark)" />
				<meta name="application-name" content="Infinity CareerOS" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-title" content="Infinity CareerOS" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<link rel="icon" href="/logo.png" type="image/png" sizes="512x512" />
				<link rel="apple-touch-icon" href="/logo.png" />
				<link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
				{/* oxlint-disable-next-line react/no-danger -- Fixed theme and Zod setup must run before page scripts. */}
				<script dangerouslySetInnerHTML={{ __html: bootstrap }} />
			</Head>
			<body>
				{/* The localized export fills this mount before the browser router loads. */}
				<div id="app" />
				<div id="initial-loader">
					<div aria-hidden="true" className="initial-loader__logo" />
					<div aria-hidden="true" className="initial-loader__spinner" />
					<span className="sr-only">Loading</span>
				</div>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
