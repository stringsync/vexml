import { color } from "core/log";
import { type Clock, Stopwatch, SystemClock } from "core/time";
import type { Deps } from "./deps";
import type { Middleware } from "./middleware";

/**
 * Says how long a command took, on stderr, as the process ends. That is
 * after the action returns, or whenever something ends the process sooner,
 * since a command that sets its exit code with `ps.exit` never returns to a
 * middleware to report it.
 *
 * ```ts
 * program.command("check").use(timed()).action(...);
 * // ... done in 1m 12s
 * ```
 */
export function timed<C extends Deps>(
	clock: Clock = new SystemClock(),
): Middleware<C> {
	return async (ctx, next) => {
		const stopwatch = new Stopwatch(clock);
		stopwatch.start();
		ctx.ps.once("exit", () => {
			ctx.log.error(color.dim(`done in ${stopwatch.elapsed().human()}`));
		});
		await next(ctx);
	};
}
