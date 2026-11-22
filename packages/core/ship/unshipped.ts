import type { Ctx } from "./ctx";

/**
 * Which commits `commitsSince` counts: those touching `paths` since the last
 * ship, marked by a git tag or, for a package released through a public
 * mirror, by the last commit that changed its `package.json`'s `version`.
 */
export type CommitsSinceOptions =
	| {
			/** The git tag the last ship left. */
			tag: string;
			/** Only commits touching these paths count. */
			paths: readonly string[];
	  }
	| {
			/** The `package.json` whose last `version` change marks the last ship. */
			version: string;
			/** Only commits touching these paths count. */
			paths: readonly string[];
	  };

/**
 * How many commits since the last ship touch `paths`, for a target's
 * `unshipped`. With no marker yet (a tag that does not exist, or a
 * `version` never changed) it counts every commit that touches them, as
 * nothing has shipped.
 */
export async function commitsSince(
	ctx: Pick<Ctx, "sh">,
	opts: CommitsSinceOptions,
): Promise<number> {
	const quote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;
	const paths = opts.paths.map(quote).join(" ");
	const command =
		"tag" in opts
			? `if git rev-parse -q --verify ${quote(`refs/tags/${opts.tag}`)} >/dev/null; then git rev-list --count ${quote(opts.tag)}..HEAD -- ${paths}; else git rev-list --count HEAD -- ${paths}; fi`
			: `m=$(git log -1 --format=%H -G${quote('"version"[[:space:]]*:')} -- ${quote(opts.version)}); if [ -n "$m" ]; then git rev-list --count "$m"..HEAD -- ${paths}; else git rev-list --count HEAD -- ${paths}; fi`;
	const out = await ctx.sh(command);
	const count = Number.parseInt(out.trim(), 10);
	if (Number.isNaN(count)) {
		throw new Error(`git did not print a commit count: ${out.trim()}`);
	}
	return count;
}
