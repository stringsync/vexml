import type { Step } from "./step";

/**
 * Runs a checked plan's steps in order: each starts once every step it
 * depends on has finished, so steps with no order between them run together.
 * After a failure no new step starts; those already running finish, then the
 * first failure is thrown, naming the step.
 */
export async function runSteps(
	steps: readonly Step[],
	start: (step: Step) => Promise<void>,
): Promise<void> {
	const finished = new Set<string>();
	const waiting = [...steps];
	const running = new Map<string, Promise<string>>();
	let failure: { id: string; error: unknown } | undefined;

	while (waiting.length || running.size) {
		if (!failure) {
			for (const step of [...waiting]) {
				if (!(step.dependencies ?? []).every((id) => finished.has(id))) {
					continue;
				}
				waiting.splice(waiting.indexOf(step), 1);
				running.set(
					step.id,
					start(step).then(
						() => step.id,
						(error: unknown) => {
							failure ??= { id: step.id, error };
							return step.id;
						},
					),
				);
			}
		}
		if (!running.size) {
			break;
		}
		const id = await Promise.race(running.values());
		running.delete(id);
		if (failure?.id !== id) {
			finished.add(id);
		}
	}

	if (failure) {
		const message =
			failure.error instanceof Error
				? failure.error.message
				: String(failure.error);
		throw new Error(`The step "${failure.id}" failed: ${message}`);
	}
}
