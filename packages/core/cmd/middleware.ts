/** Runs whatever is left of the chain, with the context it should see. */
export type Next<C> = (ctx: C) => Promise<void>;

/**
 * Wraps an action: do some work, hand a context to `next`, and do more once it
 * comes back. `Out` is what everything downstream sees, so a middleware that
 * contributes to the context widens its type as well as its value.
 *
 * Middleware runs after `--help` and after options are parsed, so it only ever
 * wraps the action itself: asking for help never pays for the setup.
 */
export type Middleware<In, Out = In> = (
	ctx: In,
	next: Next<Out>,
) => Promise<void>;

/** A middleware of any context types, as a chain holds it. */
export type AnyMiddleware = Middleware<never, never>;

/** Folds a chain into one call, innermost last. */
export function compose(
	middleware: AnyMiddleware[],
	action: (ctx: unknown) => Promise<void>,
): (ctx: unknown) => Promise<void> {
	return middleware.reduceRight<(ctx: unknown) => Promise<void>>(
		(next, mw) => (ctx) =>
			(mw as unknown as Middleware<unknown, unknown>)(ctx, next),
		action,
	);
}
