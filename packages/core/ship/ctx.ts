import type { Duration } from "core/time";

/** What a prompt can be told while it waits. */
export interface PromptOptions {
	/**
	 * Withdraws the prompt once aborted, as when the command it was for
	 * finished by itself: the page closes its card, and the call rejects
	 * with the signal's reason.
	 */
	signal?: AbortSignal;
}

/** How a command runs. */
export interface ShOptions {
	/**
	 * Watches what the command prints for the prompts it asks a person at a
	 * terminal (a sign-in link and code, a y/n question, a value to type),
	 * asks the user instead, and types the answer into the command.
	 */
	prompts?: boolean;
	/**
	 * Fails the call, killing the command, once it has run this long, even
	 * when a child it left behind still holds its output open. Without it,
	 * the step's own timeout is the only limit.
	 */
	timeout?: Duration;
}

/**
 * Everything a step can do: run commands, show a line, report a release and
 * ask the user. `run` and `done` receive one; use it for all of a step's
 * effects, and a test can pass its own.
 */
export interface Ctx {
	/** Runs a shell command, streaming its output to the page, and returns that output. */
	sh(command: string, opts?: ShOptions): Promise<string>;
	/** Replaces the line the page shows for this step. */
	update(line: string): void;
	/**
	 * Reports the version this step's target released, so the targets that
	 * depend on it get it. Call it from `run` once published, and from `done`
	 * when it finds the release already out, so a skipped step still reports.
	 */
	released(version: string): void;
	/** Asks the user a yes or no question. */
	confirm(question: string, opts?: PromptOptions): Promise<boolean>;
	/**
	 * Shows the user a link to open, with a code to enter there when it takes
	 * one, and resolves once they say they are through.
	 */
	openLink(
		link: { url: string; code?: string },
		opts?: PromptOptions,
	): Promise<void>;
	/** Asks the user for a value, such as a one-time code. */
	ask(question: string, opts?: PromptOptions): Promise<string>;
}
