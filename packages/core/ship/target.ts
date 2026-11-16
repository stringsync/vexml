import type { Ctx } from "./ctx";
import { checkGraph } from "./graph";
import type { Step } from "./step";

export type Bump = "patch" | "minor" | "major";

/** What a target's upstream released, read by a dependent's plan. */
export type Upstream = {
	readonly version: string;
};

export type PlanInput = {
	/** The bump this ship takes, when the target takes one. */
	readonly bump?: Bump;
	/** What a target named in `dependencies` released in this ship. */
	readonly upstream: (name: string) => Upstream;
};

/** Something a project ships: an npm package, a deployment. */
export type Target = {
	readonly name: string;
	/** The bump it takes by default, or absent when it takes none (a deployment). */
	readonly bump?: Bump;
	/** Targets that ship before it, by name. */
	readonly dependencies: readonly string[];
	/** The steps of one ship. Returns them, and runs nothing. */
	plan(input: PlanInput): readonly Step[];
	/** How many commits are unshipped, when the target can tell. */
	readonly unshipped?: (ctx: Pick<Ctx, "sh">) => Promise<number>;
};

/** Declares a target. It only returns the target: nothing runs. */
export function target(spec: {
	name: string;
	bump?: Bump;
	dependencies?: readonly string[];
	plan(input: PlanInput): readonly Step[];
	unshipped?: (ctx: Pick<Ctx, "sh">) => Promise<number>;
}): Target {
	if (!spec.name.trim()) {
		throw new Error("A target needs a name");
	}
	const dependencies = spec.dependencies ?? [];
	const seen = new Set<string>();
	for (const dependency of dependencies) {
		if (dependency === spec.name) {
			throw new Error(`The target "${spec.name}" depends on itself`);
		}
		if (seen.has(dependency)) {
			throw new Error(
				`The target "${spec.name}" names "${dependency}" twice in its dependencies`,
			);
		}
		seen.add(dependency);
	}
	return Object.freeze({
		name: spec.name,
		...(spec.bump && { bump: spec.bump }),
		dependencies: Object.freeze([...dependencies]),
		plan: spec.plan,
		...(spec.unshipped && { unshipped: spec.unshipped }),
	});
}

/** A step as the review screen shows it: plain data, without `done` or `run`. */
export type StepView = {
	id: string;
	does: string;
	dependencies?: string[];
};

/** A target's plan as the review screen shows it: plain data, ready for JSON. */
export type PlanView = {
	name: string;
	bump?: Bump;
	dependencies: string[];
	/** Commits not yet shipped, present only when the target declares how to count them. */
	unshipped?: number;
	steps: StepView[];
};

/**
 * The steps of one ship of `target`, checked: ids unique, and every
 * step's `dependencies` naming steps of the plan with no cycle. `bump`
 * falls back to the target's own, and `upstream` answers only for the
 * targets it depends on. Calls `plan` and nothing else: no step runs.
 */
export function steps(
	target: Target,
	input: { bump?: Bump; upstream?: (name: string) => Upstream } = {},
): readonly Step[] {
	const bump = input.bump ?? target.bump;
	if (input.bump && !target.bump) {
		throw new Error(`The target "${target.name}" takes no bump`);
	}
	const upstream = (name: string): Upstream => {
		if (!target.dependencies.includes(name)) {
			throw new Error(
				`The target "${target.name}" reads "${name}", which is not one of its dependencies`,
			);
		}
		if (!input.upstream) {
			throw new Error(
				`The target "${target.name}" reads "${name}", but nothing upstream was given`,
			);
		}
		return input.upstream(name);
	};
	const planned = target.plan({ ...(bump && { bump }), upstream });
	checkGraph(planned, "step");
	return planned;
}

/** The checked plan of one ship of `target` as plain data, for a review screen. */
export function view(
	target: Target,
	input: {
		bump?: Bump;
		upstream?: (name: string) => Upstream;
		/** The count `target.unshipped` gave, shown as is. */
		unshipped?: number;
	} = {},
): PlanView {
	const bump = input.bump ?? target.bump;
	return {
		name: target.name,
		...(bump && { bump }),
		dependencies: [...target.dependencies],
		...(input.unshipped !== undefined && { unshipped: input.unshipped }),
		steps: steps(target, input).map((each) => ({
			id: each.id,
			does: each.does,
			...(each.dependencies?.length
				? { dependencies: [...each.dependencies] }
				: {}),
		})),
	};
}
