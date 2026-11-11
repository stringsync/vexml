import type { Logger } from "./logger";

/** Where `ConsoleLogger` writes: the process's own streams by default. */
export interface ConsoleOutput {
	log(...args: unknown[]): void;
	error(...args: unknown[]): void;
	/** Raw stderr, absent in a browser. */
	stderr?: { write(text: string): unknown };
}

/**
 * Writes straight to the process's own console: stdout for info, stderr for
 * errors. Runs in the browser too, where errors go to console.error.
 */
export class ConsoleLogger implements Logger {
	constructor(
		private readonly out: ConsoleOutput = {
			log: (...args) => console.log(...args),
			error: (...args) => console.error(...args),
			stderr: typeof process === "undefined" ? undefined : process.stderr,
		},
	) {}

	info(message: unknown, ...optionalParams: unknown[]): void {
		this.out.log(message, ...optionalParams);
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		// not console.error, which Bun paints red on a terminal, so a warning
		// or a progress line would read as a failure
		const stderr = this.out.stderr;
		// node:util is looked up at call time, not imported, so a browser bundle
		// never sees it
		const util =
			typeof process === "undefined"
				? undefined
				: process.getBuiltinModule?.("node:util");
		if (stderr?.write && util) {
			stderr.write(`${util.format(message, ...optionalParams)}\n`);
			return;
		}
		this.out.error(message, ...optionalParams);
	}
}
