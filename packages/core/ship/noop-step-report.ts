import type { StepReport } from "./step";

/** A `StepReport` for a step nobody is watching: it hears what happened and tells no one. */
export class NoopStepReport implements StepReport {
	async staged(_info: Parameters<StepReport["staged"]>[0]): Promise<void> {}
}
