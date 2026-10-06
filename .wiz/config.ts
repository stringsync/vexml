import { defineConfig } from "@webappwiz/cli/config";

export default defineConfig({
	scry: {
		// vendored skills and catalog rules, both rewritten by `wiz update`
		exclude: [".agents/skills/**", ".wiz/scry/**"],
	},
});
