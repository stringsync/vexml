import { defineConfig } from "@webappwiz/cli/config";

export default defineConfig({
	credentials: { names: { TYPESAFE_API_KEY: 'TypeSafe System One, for optional vex lint semantic checks' } },
	scry: {
		budgets: 'nothing',
		// vendored skills and catalog rules, both rewritten by `wiz update`
		exclude: [".agents/skills/**", ".wiz/scry/**"],
	},
});
