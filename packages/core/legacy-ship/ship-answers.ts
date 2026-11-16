import { UuidProvider } from "core/id";
import type { Fs } from "core/system";
import { Duration, SystemTimer, type Timer } from "core/time";
import { SHIP_ANSWER } from "./contract";
import type { SignIn, StepEvents } from "./step-events";

/** What a question carries beyond its words. */
export interface AskOptions {
	/** The page and code to sign in with. */
	signIn?: SignIn;
	/** Aborting it answers the question yes, as the thing asked for happened on its own. */
	signal?: AbortSignal;
}

/** Wait for a caller to answer ship questions through a per-run JSON-lines file. */
export class ShipAnswers {
	constructor(
		private readonly path: string,
		private readonly fs: Fs,
		private readonly events: StepEvents,
		private readonly timer: Timer = new SystemTimer(),
	) {}
	async ask(
		id: string,
		name: string,
		question: string,
		opts: AskOptions = {},
	): Promise<boolean> {
		const questionId = new UuidProvider().next();
		await this.events.ask(id, name, questionId, question, opts.signIn);
		return this.await(id, name, questionId, opts);
	}

	/** Waits for the answer to a question whose event the caller already wrote. */
	async await(
		id: string,
		name: string,
		questionId: string,
		opts: Pick<AskOptions, "signal"> = {},
	): Promise<boolean> {
		return (await this.receive(id, name, questionId, opts)).answer;
	}

	/** Asks for text, such as a one-time code; undefined when it is declined or left empty. */
	async askText(
		id: string,
		name: string,
		question: string,
	): Promise<string | undefined> {
		const questionId = new UuidProvider().next();
		await this.events.ask(id, name, questionId, question, undefined, "text");
		const found = await this.receive(id, name, questionId);
		const text = found.text?.trim();
		return found.answer && text ? text : undefined;
	}

	private async receive(
		id: string,
		name: string,
		questionId: string,
		opts: Pick<AskOptions, "signal"> = {},
	): Promise<{ answer: boolean; text?: string }> {
		for (;;) {
			// The thing asked for happened on its own: the question answers itself.
			if (opts.signal?.aborted) {
				await this.events.answered(id, name, questionId, true);
				return { answer: true };
			}
			if (await this.fs.exists(this.path)) {
				const lines = (await this.fs.read(this.path)).split("\n");
				// A writer may still be appending the final line.
				lines.pop();
				for (const line of lines) {
					if (line.trim() === "") {
						continue;
					}
					const value = SHIP_ANSWER.safeParse(JSON.parse(line));
					if (value.success && value.data.questionId === questionId) {
						await this.events.answered(id, name, questionId, value.data.answer);
						return { answer: value.data.answer, text: value.data.text };
					}
				}
			}
			await new Promise<void>((resolve) => {
				const waiting = this.timer.setTimeout(() => {
					waiting.dispose();
					resolve();
				}, Duration.ms(100));
			});
		}
	}
}
