import { defineConfig } from "@webappwiz/cli/config";

export default defineConfig({
	scry: {
		// vendored skills, rewritten by `wiz update` and shadcn
		exclude: [".agents/skills/**"],
	},
});
