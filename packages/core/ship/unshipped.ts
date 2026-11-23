import type { Ctx } from "./ctx";

/**
 * Which commits `commitsSince` counts: those touching `paths` since the last
 * ship, marked by a git tag, by the newest `<package>@<version>` tag
 * `npm.release` leaves, or by the last commit that changed a
 * `package.json`'s `version`.
 */
export type CommitsSinceOptions =
	| {
			/** The git tag the last ship left. */
			tag: string;
			/** Only commits touching these paths count. */
			paths: readonly string[];
	  }
	| {
			/**
			 * The npm package whose newest `<package>@<version>` tag, by version,
			 * marks the last ship: the mono commit `npm.release` built it from.
			 */
			release: string;
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
 * `unshipped`. With no marker yet (a tag that does not exist, a package
 * never released, or a `version` never changed) it counts every commit that touches them, as
 * nothing has shipped.
 */
export async function commitsSince(
	ctx: Pick<Ctx, "sh">,
	opts: CommitsSinceOptions,
): Promise<number> {
	const quote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;
	const paths = opts.paths.map(quote).join(" ");
	const since = (marker: string) =>
		`if [ -n "${marker}" ]; then git rev-list --count "${marker}"..HEAD -- ${paths}; else git rev-list --count HEAD -- ${paths}; fi`;
	const command =
		"tag" in opts
			? `if git rev-parse -q --verify ${quote(`refs/tags/${opts.tag}`)} >/dev/null; then git rev-list --count ${quote(opts.tag)}..HEAD -- ${paths}; else git rev-list --count HEAD -- ${paths}; fi`
			: "release" in opts
				? `m=$(git for-each-ref --sort=-v:refname --count=1 --format='%(refname)' ${quote(`refs/tags/${releaseTag(opts.release, "*")}`)}); ${since("$m")}`
				: `m=$(git log -1 --format=%H -G${quote('"version"[[:space:]]*:')} -- ${quote(opts.version)}); ${since("$m")}`;
	const out = await ctx.sh(command);
	const count = Number.parseInt(out.trim(), 10);
	if (Number.isNaN(count)) {
		throw new Error(`git did not print a commit count: ${out.trim()}`);
	}
	return count;
}

/**
 * The mono tag `npm.release` leaves on the commit it built `version` of
 * `name` from, npm's own `name@version` form: `@stringsync/mdom@0.8.18`.
 */
export function releaseTag(name: string, version: string): string {
	return `${name}@${version}`;
}
