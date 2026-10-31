/**
 * Left out of every mirror: what only helps agents work in mono, since a mirror
 * holds the bare minimum to run. Globs match paths relative to the mirrored
 * project's folder.
 */
export const AGENT_FILES = [
	"**/AGENTS.md",
	"**/CLAUDE.md",
	"**/.claude/**",
	"**/.agents/**",
	"skills/**",
	"splates.config.ts",
	"SPLATES.md",
];
