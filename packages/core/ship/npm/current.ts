import type { Ctx } from "../ctx";

/**
 * npm's latest version of `name`, for a target's `current`.
 *
 * @example
 * target({ name, plan, current: npm.current("@stringsync/mdom") })
 */
export function current(
	name: string,
): (ctx: Pick<Ctx, "sh">) => Promise<string> {
	return async (ctx) => {
		const version = (
			await ctx.sh(
				`npm view --prefer-online '${name.replace(/'/g, "'\\''")}' version 2>/dev/null || true`,
			)
		).trim();
		if (!version) {
			throw new Error(`npm has no version of ${name}`);
		}
		return version;
	};
}
