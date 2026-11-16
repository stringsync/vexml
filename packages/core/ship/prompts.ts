import type { Resource } from "core/disposable";

/** A question a step puts to the user. */
export type Prompt =
	| { kind: "confirm"; question: string }
	| { kind: "link"; url: string; code?: string }
	| { kind: "ask"; question: string };

/** The line `run` writes when a step asks: the prompt, under an id its answer names. */
export type PromptLine = { type: "prompt"; id: string } & Prompt;

/** The line `run` writes when a prompt it wrote no longer wants an answer. */
export interface WithdrawnLine {
	type: "withdrawn";
	id: string;
}

/**
 * The line splates writes to a running step's stdin to answer prompt `id`:
 * `true` or `false` for a confirm, the text for an ask, anything for a link.
 */
export interface AnswerLine {
	type: "answer";
	id: string;
	value?: unknown;
}

/** Where prompt lines go. */
export interface PromptSink {
	send(line: PromptLine | WithdrawnLine): void;
}

/** Where the answers come from: a stream of answer lines, opened once a step asks. */
export interface AnswerInput {
	open(): ReadableStream<Uint8Array>;
}

/** What a step's prompts are put through. */
export interface Prompts {
	/** Puts `prompt` to the user and resolves to the answer's value. */
	ask(prompt: Prompt, signal?: AbortSignal): Promise<unknown>;
}

/** Prompts where nobody can answer, as in `done`: each fails the step. */
export const noPrompts: Prompts = {
	ask: async (prompt) => {
		throw new Error(
			`The step asked (${prompt.kind}) where nobody can answer: only run asks`,
		);
	},
};

interface Waiting {
	prompt: Prompt;
	resolve(value: unknown): void;
	reject(error: Error): void;
}

/**
 * Puts a step's prompts to splates over `run`, as `serve` does: hand it the
 * stream `run` writes and the input the answers come back on, ask through
 * it, and dispose of it once the step ends. A step stopped while it waits
 * asks again when it runs again; once the input ends, its prompts fail.
 */
export class PromptChannel implements Prompts, Resource {
	private next = 1;
	private readonly waiting = new Map<string, Waiting>();
	private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
	private ended = false;

	constructor(
		private readonly sink: PromptSink,
		private readonly input: AnswerInput,
	) {}

	/** Sends `prompt` and resolves to its answer's value. */
	ask(prompt: Prompt, signal?: AbortSignal): Promise<unknown> {
		if (signal?.aborted) {
			return Promise.reject(signal.reason);
		}
		if (this.ended) {
			return Promise.reject(nobody());
		}
		const id = String(this.next++);
		return new Promise((resolve, reject) => {
			const withdraw = () => {
				if (this.waiting.delete(id)) {
					this.sink.send({ type: "withdrawn", id });
					reject(signal?.reason);
				}
			};
			signal?.addEventListener("abort", withdraw, { once: true });
			const settle =
				<T>(fn: (value: T) => void) =>
				(value: T) => {
					signal?.removeEventListener("abort", withdraw);
					fn(value);
				};
			this.waiting.set(id, {
				prompt,
				resolve: settle(resolve),
				reject: settle(reject),
			});
			this.sink.send({ type: "prompt", id, ...prompt });
			this.read();
		});
	}

	/** Stops reading `input`, so the process can end. */
	dispose(): void {
		this.ended = true;
		void this.reader?.cancel().catch(() => {});
	}

	// Answers are read from the first prompt on, each settling the prompt its id names.
	private read(): void {
		if (this.reader) {
			return;
		}
		const reader = this.input.open().getReader();
		this.reader = reader;
		void (async () => {
			const decoder = new TextDecoder();
			let partial = "";
			try {
				for (;;) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					const lines = (
						partial + decoder.decode(value, { stream: true })
					).split("\n");
					partial = lines.pop() ?? "";
					for (const line of lines) {
						this.answer(line);
					}
				}
				this.answer(partial);
			} catch {
				// a closed or broken stdin answers nothing more
			}
			this.ended = true;
			for (const [id, each] of this.waiting) {
				this.waiting.delete(id);
				each.reject(nobody());
			}
		})();
	}

	private answer(line: string): void {
		if (!line.trim()) {
			return;
		}
		let parsed: Partial<AnswerLine>;
		try {
			parsed = JSON.parse(line);
		} catch {
			return;
		}
		if (parsed?.type !== "answer" || typeof parsed.id !== "string") {
			return;
		}
		const waiting = this.waiting.get(parsed.id);
		if (!waiting) {
			// a late answer to a prompt withdrawn meanwhile
			return;
		}
		this.waiting.delete(parsed.id);
		const { kind } = waiting.prompt;
		const want = { confirm: "boolean", ask: "string", link: undefined }[kind];
		if (want && typeof parsed.value !== want) {
			waiting.reject(
				new Error(
					`The answer to a ${kind} prompt must be a ${want}, not ${JSON.stringify(parsed.value)}`,
				),
			);
			return;
		}
		waiting.resolve(parsed.value);
	}
}

function nobody(): Error {
	return new Error(
		"The step asked, and nobody is there to answer: run's stdin closed",
	);
}
