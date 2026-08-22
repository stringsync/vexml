// arbor runs through `bunx @webappwiz/arbor`, so it is not a dependency here and
// this file cannot import its `defineConfig`. That costs key-name checking on the
// object below; arbor validates what it reads anyway.
export default {
	// This repo's trunk is master, not arbor's default of main.
	trunk: 'master',
	// A fresh worktree has no node_modules, and a rebase can bring in a
	// dependency that the preMerge gate needs installed to run.
	postCheckout: 'bun install',
	postRewrite: 'bun install',
	// A merge can bring the same thing in from trunk, and it deletes the worktree,
	// so the install has to land back in the main tree.
	postMerge: 'bun install',
	// The only gate between an agent's work and trunk, so it runs both of the
	// commands CLAUDE.md asks for: fix is biome + tsc + xmllint, test is bun
	// test. --check so the gate reads the tree instead of writing to it.
	preMerge: './bin/vex fix --check && ./bin/vex test',
};
