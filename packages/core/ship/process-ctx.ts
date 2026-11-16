import type { Ps } from "core/system";
import { Duration, SystemTimer } from "core/time";
import { type Asker, answeringSh, type Quiet } from "./answering-sh";
import type { Ctx, PromptOptions, ShOptions } from "./ctx";
import { LineOutput } from "./line-output";
import type { Prompt, PromptLine, Prompts, WithdrawnLine } from "./prompts";

/** How many lines of a failed command's output its error carries. */
const TAIL_LINES = 20;

/** Where a command's output goes as it arrives. */
export interface Output {
	write(text: string): void;
}

/** One line `run` writes to stdout, as JSON. */
export type RunLine =
	| { type: "output"; text: string }
	| { type: "update"; line: string }
	| { type: "released"; version: string }
	| PromptLine
	| WithdrawnLine
	| { type: "error"; message: string };

/** Where `run` sends its lines. */
export interface RunStream {
	send(line: RunLine): void;
}

/** Where lines go to be read. */
export interface Printer {
	print(line: string): void;
}

/** The person at a terminal: what they read, and what they type back. */
export interface Terminal extends Printer {
	/**
	 * Shows the question and resolves to the line typed back; once `signal`
	 * aborts, stops waiting and rejects with its reason.
	 */
	ask(question: string, signal?: AbortSignal): Promise<string>;
}

/** Makes the ctx a served step runs with, on this process. */
export class StepCtxs {
	private readonly quiet: Quiet;

	/**
	 * `quiet` is how long a command run with `{ prompts: true }` stays quiet
	 * before what it last printed is read as a question: a second, by default.
	 */
	constructor(
		private readonly ps: Ps,
		quiet: Partial<Quiet> = {},
	) {
		this.quiet = {
			timer: quiet.timer ?? new SystemTimer(),
			after: quiet.after ?? Duration.secs(1),
		};
	}

	/**
	 * Runs the command in a shell, writing its output to `out` as it arrives,
	 * and returns its stdout. With `prompts`, what the command asks goes to
	 * `asker`, and the answers are typed into it. A non-zero exit throws,
	 * naming the command and the end of its output, which fails the step.
	 */
	async sh(
		command: string,
		out: Output,
		asker: Asker,
		opts: ShOptions = {},
	): Promise<string> {
		const result = opts.prompts
			? await answeringSh(this.ps, command, out, asker, this.quiet)
			: await this.ps.spawnCapture(["sh", "-c", command], {
					watcher: {
						stdout: (text) => out.write(text),
						stderr: (text) => out.write(text),
					},
				});
		if (result.exitCode !== 0) {
			const tail = `${result.stdout}${result.stderr}`
				.trimEnd()
				.split("\n")
				.slice(-TAIL_LINES)
				.join("\n");
			throw new Error(
				`\`${command}\` exited ${result.exitCode}${tail ? `:\n${tail}` : ""}`,
			);
		}
		return result.stdout;
	}

	/**
	 * The ctx of a step served to splates: everything it says goes to
	 * `stream` as JSON lines, and its prompts go out through `prompts`, which
	 * reads their answers back. Where nobody is there to answer, as for
	 * `done`, `noPrompts` fails a step that asks.
	 */
	stream(stream: RunStream, prompts: Prompts): Ctx {
		const put = (prompt: Prompt, opts?: PromptOptions) =>
			prompts.ask(prompt, opts?.signal);
		const ctx: Ctx = {
			sh: (command, opts) =>
				this.sh(
					command,
					{ write: (text) => stream.send({ type: "output", text }) },
					ctx,
					opts,
				),
			update: (line) => stream.send({ type: "update", line }),
			released: (version) => stream.send({ type: "released", version }),
			confirm: async (question, opts) =>
				(await put({ kind: "confirm", question }, opts)) as boolean,
			openLink: async ({ url, code }, opts) => {
				await put({ kind: "link", url, ...(code && { code }) }, opts);
			},
			ask: async (question, opts) =>
				(await put({ kind: "ask", question }, opts)) as string,
		};
		return ctx;
	}

	/**
	 * The ctx of step `id` run in a terminal: output and updates print as
	 * lines under the step's id, and prompts go to the person at it.
	 */
	terminal(terminal: Terminal, id: string): Ctx {
		const say = (line: string) => terminal.print(`[${id}] ${line}`);
		const ask = (question: string, opts?: PromptOptions) =>
			abortable(
				terminal.ask(`[${id}] ${question} `, opts?.signal),
				opts?.signal,
			);
		const ctx: Ctx = {
			sh: async (command, opts) => {
				const lines = new LineOutput({ print: say });
				try {
					return await this.sh(command, lines, ctx, opts);
				} finally {
					lines.flush();
				}
			},
			update: say,
			released: (version) => say(`released ${version}`),
			confirm: async (question, opts) =>
				/^y(es)?$/i.test((await ask(`${question} [y/N]`, opts)).trim()),
			openLink: async ({ url, code }, opts) => {
				say(`Open ${url}${code ? ` and enter ${code}` : ""}`);
				await ask("Press enter once done", opts);
			},
			ask,
		};
		return ctx;
	}
}

/** `promise`, or its reason once `signal` aborts, whichever comes first. */
function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
	if (!signal) {
		return promise;
	}
	if (signal.aborted) {
		return Promise.reject(signal.reason);
	}
	return new Promise((resolve, reject) => {
		const abort = () => reject(signal.reason);
		signal.addEventListener("abort", abort, { once: true });
		promise.then(resolve, reject).finally(() => {
			signal.removeEventListener("abort", abort);
		});
	});
}
