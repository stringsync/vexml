import { Duration, SystemTimer, type Timer } from "core/time";
import type { Cut } from "./cut";
import type { StepDeclaration, StepEvents } from "./step-events";

/** The first wait between checks, doubling each time up to `CHECK_BACKOFF_MAX`. */
const CHECK_INTERVAL = Duration.secs(10);
const CHECK_BACKOFF_MAX = Duration.mins(2);

/** Runs declared work and its checks, reporting every transition. */
export class StepRunner {
	constructor(
		private readonly events: StepEvents,
		private readonly timer: Timer = new SystemTimer(),
	) {}

	async declare(steps: readonly StepDeclaration[]): Promise<void> {
		for (const step of steps) {
			await this.events.declared(step);
		}
	}

	async run(
		declaration: StepDeclaration,
		cut: Cut,
		opts: StepRunOptions = {},
	): Promise<void> {
		if (opts.done === true) {
			await this.events.skipped(declaration);
			return;
		}
		await this.events.started(declaration);
		try {
			await declaration.step.run(cut, {
				staged: (info) => this.events.staged(declaration, info),
			});
			let waited = Duration.zero();
			let interval = CHECK_INTERVAL;
			while (declaration.step.check !== undefined) {
				const found = await declaration.step.check(cut, waited);
				const report = typeof found === "boolean" ? { passed: found } : found;
				await this.events.check(declaration, report);
				if (report.passed) {
					break;
				}
				const every = declaration.step.checkEvery ?? interval;
				await this.wait(every);
				waited = waited.add(every);
				interval = Duration.min(interval.multiply(2), CHECK_BACKOFF_MAX);
			}
			await this.events.done(declaration);
		} catch (error) {
			await this.events.failed(declaration, error);
			throw error;
		}
	}

	private async wait(interval: Duration): Promise<void> {
		await new Promise<void>((resolve) => {
			const waiting = this.timer.setTimeout(() => {
				waiting.dispose();
				resolve();
			}, interval);
		});
	}
}

interface StepRunOptions {
	done?: boolean;
}
