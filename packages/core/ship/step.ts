import { Duration } from "core/time";
import type { Ctx } from "./ctx";

/** How long a step may run before it fails, unless it declares its own. */
export const DEFAULT_STEP_TIMEOUT = Duration.mins(60);

/** One thing a ship does, run as its own short process. */
export type Step = {
	/** Unique within its target's plan. */
	readonly id: string;
	/** The line the review screen shows. */
	readonly does: string;
	/** Steps of the same target that must finish first. */
	readonly dependencies?: readonly string[];
	/** Whether this already happened, so a resumed ship can skip it. */
	done?(ctx: Ctx): Promise<boolean>;
	/**
	 * How long `run` may take before the step fails, naming it, so a ship
	 * stops and can be retried instead of waiting forever: an hour by default.
	 * Raise it for a step that genuinely takes longer.
	 */
	timeout?: Duration;
	/** Does it. */
	run(ctx: Ctx): Promise<unknown>;
};

/** Declares a step. It only returns the step: nothing runs. */
export function step(spec: Step): Step {
	if (!spec.id.trim()) {
		throw new Error("A step needs an id");
	}
	if (!spec.does.trim()) {
		throw new Error(`The step "${spec.id}" needs a does line`);
	}
	const limit = spec.timeout ?? DEFAULT_STEP_TIMEOUT;
	const run = (ctx: Ctx) =>
		withTimeout(spec.run(ctx), limit, `The step "${spec.id}" timed out`);
	return Object.freeze({
		...spec,
		run,
		...(spec.dependencies && {
			dependencies: Object.freeze([...spec.dependencies]),
		}),
	});
}

/** `work`, or a rejection once `limit` passes, whichever comes first. */
export function withTimeout<T>(
	work: Promise<T>,
	limit: Duration,
	what: string,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`${what} after ${Math.round(limit.ms / 1000)}s`)),
			limit.ms,
		);
		work.then(resolve, reject).finally(() => clearTimeout(timer));
	});
}
