import { color, type Logger } from "core/log";
import type { ShipAnswers } from "./ship-answers";
import type { Step } from "./step";
import type { Bump } from "./version";

/** The version about to go out, and everything the prompt should say about it. */
export interface Next {
	bump: Bump;
	resuming: boolean;
	current: string;
}

export interface ConfirmationOptions {
	/** Asks a question, answering null when nobody answers. */
	ask: (message: string) => string | null;
	log: Logger;
	/** Whether to go ahead without asking. */
	yes?: boolean;
	answers?: ShipAnswers;
	approved?: boolean;
}

/**
 * The questions a release asks before it goes ahead: once for the whole
 * release, and once before each step that declares a `confirm`. Terminal
 * callers can skip prompts with `yes`; an answer channel always waits.
 */
export class Confirmation {
	constructor(private readonly opts: ConfirmationOptions) {}

	/** Whether to go ahead, having said what would go out. */
	async release(
		packages: readonly string[],
		version: string,
		next: Next,
		live: readonly string[] = [],
	): Promise<boolean> {
		const { log } = this.opts;
		log.info(
			next.resuming
				? `finishing the release of ${version}`
				: `${next.current} -> ${version} (${next.bump})`,
		);
		for (const name of packages) {
			log.info(`  ${name}`);
		}
		for (const line of live) {
			log.info(color.yellow(`  ${line}`));
		}
		return (
			this.opts.approved === true ||
			this.yes(
				"release",
				"Release",
				color.yellow(
					`publish ${packages.length} packages as ${version}? (y/n)`,
				),
			)
		);
	}

	/**
	 * Asks the question a step declares, if it declares one, and says whether
	 * the step may run. Say no and the release stops there; run it again to
	 * resume.
	 */
	async step(step: Step, id: string): Promise<boolean> {
		if (step.confirm === undefined) {
			return true;
		}
		if (await this.yes(id, step.name, color.yellow(`${step.confirm} (y/n)`))) {
			return true;
		}
		this.opts.log.info(
			color.red(`stopped before ${step.name}: run the release again to resume`),
		);
		return false;
	}

	private async yes(
		id: string,
		name: string,
		question: string,
	): Promise<boolean> {
		if (this.opts.answers !== undefined) {
			return this.opts.answers.ask(id, name, question);
		}
		return (
			this.opts.yes === true ||
			this.opts.ask(question)?.trim().toLowerCase() === "y"
		);
	}
}
