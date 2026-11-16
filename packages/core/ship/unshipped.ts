import type { Ctx } from "./ctx";

/** Which commits `commitsSince` counts. */
export interface CommitsSinceOptions {
	/** The git tag the last ship left. */
	tag: string;
	/** Only commits touching these paths count. */
	paths: readonly string[];
}

/**
 * How many commits since git tag `tag` touch `paths`, for a target's
 * `unshipped`. A tag that does not exist yet counts every commit that
 * touches them, as nothing has shipped.
 */
export async function commitsSince(
	ctx: Pick<Ctx, "sh">,
	opts: CommitsSinceOptions,
): Promise<number> {
	const quote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;
	const paths = opts.paths.map(quote).join(" ");
	const tag = quote(opts.tag);
	const out = await ctx.sh(
		`if git rev-parse -q --verify ${quote(`refs/tags/${opts.tag}`)} >/dev/null; then git rev-list --count ${tag}..HEAD -- ${paths}; else git rev-list --count HEAD -- ${paths}; fi`,
	);
	const count = Number.parseInt(out.trim(), 10);
	if (Number.isNaN(count)) {
		throw new Error(`git did not print a commit count: ${out.trim()}`);
	}
	return count;
}
