import type { Ctx } from "./ctx";
import { checkGraph } from "./graph";
import { next } from "./npm/version";
import type { Step } from "./step";

/** Declares a target. It only returns the target: nothing runs. */
export function target(spec: {
	name: string;
	bump?: Bump;
	version?: VersionSpec;
	dependencies?: readonly string[];
	plan(input: PlanInput): readonly Step[];
	unshipped?: (ctx: Pick<Ctx, "sh">) => Promise<number>;
	current?: (ctx: Pick<Ctx, "sh">) => Promise<string>;
	versions?: (ctx: Pick<Ctx, "sh">) => Promise<readonly VersionChoice[]>;
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
	const follows = spec.version?.follows;
	if (follows !== undefined && !seen.has(follows)) {
		throw new Error(
			`The target "${spec.name}" follows "${follows}", which is not one of its dependencies`,
		);
	}
	return Object.freeze({
		name: spec.name,
		...(spec.bump && { bump: spec.bump }),
		...(spec.version && { version: Object.freeze({ ...spec.version }) }),
		dependencies: Object.freeze([...dependencies]),
		plan: spec.plan,
		...(spec.unshipped && { unshipped: spec.unshipped }),
		...(spec.current && { current: spec.current }),
		...(spec.versions && { versions: spec.versions }),
	});
}

export type Bump = "patch" | "minor" | "major";

/** What a target's upstream released, read by a dependent's plan. */
export type Upstream = {
	readonly version: string;
};

export type PlanInput = {
	/** The bump this ship takes, when the target takes one. */
	readonly bump?: Bump;
	/** The exact artifact version selected for this ship. */
	readonly version?: string;
	/** What a target named in `dependencies` released in this ship. */
	readonly upstream: (name: string) => Upstream;
};

/**
 * A version a target may ship, as a version picker lists it: one it can
 * fetch again, such as one an upstream stage verified.
 */
export type VersionChoice = {
	readonly version: string;
	/** A short note beside it, such as "staging now" or a date. */
	readonly note?: string;
};

/** A target's artifact versions: what it runs now, and what it may follow. */
export type VersionSpec = {
	/** The version it runs now, which enables resolving a bump. */
	readonly current?: string;
	/**
	 * A dependency whose release this target can take: shipped together
	 * with no version picked, it ships the version that dependency releases.
	 */
	readonly follows?: string;
};

/** Something a project ships: an npm package, a deployment. */
export type Target = {
	readonly name: string;
	/** The bump it takes by default, or absent when it has no default bump. */
	readonly bump?: Bump;
	/** Opt into artifact versions; current enables resolving a bump without running steps. */
	readonly version?: VersionSpec;
	/** Targets that ship before it, by name. */
	readonly dependencies: readonly string[];
	/** The steps of one ship. Returns them, and runs nothing. */
	plan(input: PlanInput): readonly Step[];
	/** How many commits are unshipped, when the target can tell. */
	readonly unshipped?: (ctx: Pick<Ctx, "sh">) => Promise<number>;
	/** The version it is at now, when the target can tell. */
	readonly current?: (ctx: Pick<Ctx, "sh">) => Promise<string>;
	/** The versions it may ship, newest first, when the target can tell. */
	readonly versions?: (
		ctx: Pick<Ctx, "sh">,
	) => Promise<readonly VersionChoice[]>;
};

/** A step as the review screen shows it: plain data, without `done` or `run`. */
export type StepView = {
	id: string;
	does: string;
	dependencies?: string[];
};

/** A target's plan as the review screen shows it: plain data, ready for JSON. */
export type PlanView = {
	name: string;
	/** Present for targets that accept artifact versions. */
	versioned?: boolean;
	/** The dependency whose release it ships when no version is picked. */
	follows?: string;
	version?: string;
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
	input: {
		bump?: Bump;
		version?: string;
		upstream?: (name: string) => Upstream;
	} = {},
): readonly Step[] {
	const { bump, version } = selection(target, input);
	if (input.bump && !target.bump && !target.version) {
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
	const planned = target.plan({
		...(bump && { bump }),
		...(version !== undefined && { version }),
		upstream,
	});
	checkGraph(planned, "step");
	return planned;
}

/** The checked plan of one ship of `target` as plain data, for a review screen. */
export function view(
	target: Target,
	input: {
		bump?: Bump;
		version?: string;
		upstream?: (name: string) => Upstream;
		/** The count `target.unshipped` gave, shown as is. */
		unshipped?: number;
	} = {},
): PlanView {
	const { bump, version } = selection(target, input);
	return {
		name: target.name,
		...(target.version && { versioned: true }),
		...(target.version?.follows !== undefined && {
			follows: target.version.follows,
		}),
		...(version !== undefined && { version }),
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

/** Resolve only from declared data, so reviewing a plan executes nothing. */
function selection(
	target: Target,
	input: { bump?: Bump; version?: string },
): { bump?: Bump; version?: string } {
	if (input.version !== undefined) {
		if (!target.version) {
			throw new Error(`The target "${target.name}" takes no version`);
		}
		if (!input.version.trim() || input.version !== input.version.trim()) {
			throw new Error(
				"A version must be nonempty and have no surrounding whitespace",
			);
		}
		if (input.bump) {
			throw new Error("Choose either a version or a bump, not both");
		}
		return { version: input.version };
	}
	const bump = input.bump ?? target.bump;
	if (target.version && bump) {
		if (!target.version.current) {
			throw new Error(
				`The target "${target.name}" needs a current version to bump`,
			);
		}
		if (
			!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(target.version.current)
		) {
			throw new Error(
				`"${target.version.current}" is not a stable semantic version to bump`,
			);
		}
		return { version: next(target.version.current, bump) };
	}
	return { ...(bump && { bump }) };
}
