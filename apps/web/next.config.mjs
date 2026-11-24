import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TanStackRouterWebpack } from "@tanstack/router-plugin/webpack";

const webRoot = fileURLToPath(new URL(".", import.meta.url));
const { version } = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const { dependencies } = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8"));

// The app runs entirely in the browser and keeps its data in localStorage: there is no backend or database.
/** @type {import("next").NextConfig} */
const nextConfig = {
	outputFileTracingRoot: process.env.VERCEL === "1" ? fileURLToPath(new URL("../../", import.meta.url)) : webRoot,
	poweredByHeader: false,
	devIndicators: false,
	generateBuildId: () => process.env.TURBO_HASH ?? null,
	skipTrailingSlashRedirect: true,
	transpilePackages: Object.keys(dependencies).filter((name) => name.startsWith("@reactive-resume/")),
	webpack(config, { buildId, isServer, webpack }) {
		config.plugins.push(
			new webpack.DefinePlugin({
				__APP_VERSION__: JSON.stringify(version),
				"process.env.NEXT_PUBLIC_APP_BUILD_ID": JSON.stringify(buildId),
			}),
		);
		if (!isServer) {
			config.plugins.push(
				TanStackRouterWebpack({
					target: "react",
					routesDirectory: `${webRoot}src/routes`,
					generatedRouteTree: `${webRoot}src/routeTree.gen.ts`,
					semicolons: true,
					quoteStyle: "double",
					autoCodeSplitting: true,
				}),
			);
		}
		config.module.rules.push({ test: /\.po$/, use: "@lingui/loader" });

		return config;
	},
	// Every path that isn't a page or a static file boots the client router, which resolves it in the browser.
	rewrites: () => Promise.resolve({ fallback: [{ source: "/:path((?!_next/).*)", destination: "/" }] }),
};

export default nextConfig;
