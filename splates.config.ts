// splates runs through `bunx @stringsync/splates`, so it is not a dependency here.
// Keep the config import-free; splates validates it when loading it.
export default {
	// This repo's trunk is master, not splates's default of main.
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
	// `vex ship` requires a bump type, so `splates ship vexml` publishes the next patch.
	ship: './bin/vex ship patch',
};
