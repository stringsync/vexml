import type { Ctx } from "./ctx";

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
	return Object.freeze({
		...spec,
		...(spec.dependencies && {
			dependencies: Object.freeze([...spec.dependencies]),
		}),
	});
}
