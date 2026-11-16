// Chunks for trying a ship without shipping anything: each step waits,
// fails or asks, and none sends anything out. They back the placeholder
// ships the user hand tests and the engine's tests, and go once real
// targets cover what they show.
import { Duration, SystemTimer, type Timer } from "core/time";
import { type Step, step } from "./step";

type Placed = {
	/** The id the chunk's last step takes, for later steps to depend on. */
	id: string;
	/** Steps of the same target the chunk's first steps wait for. */
	dependencies?: readonly string[];
};

/**
 * Waits `seconds`, updating its line once a second. With `branches`, that
 * many waits run side by side as `<id>-1`, `<id>-2`..., and the step `<id>`
 * follows once all of them finish.
 */
export function wait(
	spec: Placed & { seconds: number; branches?: number; timer?: Timer },
): Step[] {
	const timer = spec.timer ?? new SystemTimer();
	const waiting = (id: string, dependencies?: readonly string[]) =>
		step({
			id,
			does: `Wait ${spec.seconds}s`,
			dependencies,
			run: async (ctx) => {
				for (let second = 1; second <= spec.seconds; second++) {
					await new Promise<void>((resolve) => {
						timer.setTimeout(resolve, Duration.secs(1));
					});
					ctx.update(`Waited ${second}s of ${spec.seconds}s`);
				}
			},
		});
	if (!spec.branches || spec.branches < 2) {
		return [waiting(spec.id, spec.dependencies)];
	}
	const ids = Array.from(
		{ length: spec.branches },
		(_, index) => `${spec.id}-${index + 1}`,
	);
	return [
		...ids.map((id) => waiting(id, spec.dependencies)),
		join(spec.id, ids),
	];
}

/**
 * Fails until a file exists at `marker`, so a ship can be stopped and then
 * fixed by hand (`touch <marker>`) to retry it.
 */
export function failUntil(spec: Placed & { marker: string }): Step[] {
	return [
		step({
			id: spec.id,
			does: `Fail until ${spec.marker} exists`,
			dependencies: spec.dependencies,
			run: async (ctx) => {
				const quoted = `'${spec.marker.replaceAll("'", `'\\''`)}'`;
				const found = await ctx.sh(
					`test -e ${quoted} && echo found || echo missing`,
				);
				if (found.trim() !== "found") {
					throw new Error(
						`${spec.marker} does not exist yet; create it to fix this step: touch ${quoted}`,
					);
				}
				ctx.update(`Found ${spec.marker}`);
			},
		}),
	];
}

/**
 * Puts every kind of prompt to the user at once: a yes or no question, a
 * sign-in link with a code, and a value to enter, as steps `<id>-confirm`,
 * `<id>-link` and `<id>-ask`. Depend on `<id>` to go on once all three are
 * answered. Answering no fails the confirm step.
 */
export function prompts(spec: Placed): Step[] {
	const ids = {
		confirm: `${spec.id}-confirm`,
		link: `${spec.id}-link`,
		ask: `${spec.id}-ask`,
	};
	return [
		step({
			id: ids.confirm,
			does: "Ask to go on",
			dependencies: spec.dependencies,
			run: async (ctx) => {
				if (!(await ctx.confirm("Go on with this placeholder ship?"))) {
					throw new Error("The user chose not to go on");
				}
				ctx.update("Going on");
			},
		}),
		step({
			id: ids.link,
			does: "Show a sign-in link",
			dependencies: spec.dependencies,
			run: async (ctx) => {
				await ctx.openLink({
					url: "https://example.com/device",
					code: "ABCD-EFGH",
				});
				ctx.update("Signed in");
			},
		}),
		step({
			id: ids.ask,
			does: "Ask for a value",
			dependencies: spec.dependencies,
			run: async (ctx) => {
				const value = await ctx.ask("Any value, such as a one-time code?");
				ctx.update(`Got "${value}"`);
			},
		}),
		join(spec.id, Object.values(ids)),
	];
}

function join(id: string, dependencies: readonly string[]): Step {
	return step({
		id,
		does: `Go on once ${dependencies.join(", ")} finish`,
		dependencies,
		run: async () => {},
	});
}
