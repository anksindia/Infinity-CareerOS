import { describe, expect, it } from "vite-plus/test";
import { transformAsync } from "@babel/core";
import reactCompiler from "babel-plugin-react-compiler";

// The Next.js build uses Babel with the React Compiler.
// Under Babel 8, babel-plugin-react-compiler 1.0 silently skips every function with a destructuring default.
describe("React Compiler build setup", () => {
	it("compiles a component that destructures props with a default", async () => {
		const result = await transformAsync("export function Badge({ tone = 'ink' }) { return <span>{tone}</span>; }", {
			filename: "badge.jsx",
			babelrc: false,
			configFile: false,
			plugins: [reactCompiler],
			parserOpts: { plugins: ["jsx"] },
		});

		expect(result?.code).toContain("react/compiler-runtime");
	});
});
