import type { Logger } from "./logger";

/**
 * Writes straight to the process's own console: stdout for info, stderr for
 * errors. Runs in the browser too, where errors go to console.error.
 */
export class ConsoleLogger implements Logger {
	info(message: unknown, ...optionalParams: unknown[]): void {
		console.log(message, ...optionalParams);
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		// not console.error, which Bun paints red on a terminal, so a warning
		// or a progress line would read as a failure
		const stderr = typeof process === "undefined" ? undefined : process.stderr;
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
		console.error(message, ...optionalParams);
	}
}
