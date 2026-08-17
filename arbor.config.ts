import { defineConfig } from '@webappwiz/arbor/config';

export default defineConfig({
	// This repo's trunk is master, not arbor's default of main.
	trunk: 'master',
	// A fresh worktree has no node_modules, and a rebase can bring in a
	// dependency that the preMerge gate needs installed to run.
	postCheckout: 'bun install',
	postRewrite: 'bun install',
	// The only gate between an agent's work and trunk, so it runs both of the
	// commands CLAUDE.md asks for: fix is biome + tsc + xmllint, test is bun
	// test. --check so the gate reads the tree instead of writing to it.
	preMerge: './bin/vex fix --check && ./bin/vex test',
});
