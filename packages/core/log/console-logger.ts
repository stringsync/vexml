import { format } from "node:util";
import type { Logger } from "./logger";

/** Writes straight to the process's own console: stdout for info, stderr for errors. */
export class ConsoleLogger implements Logger {
	info(message: unknown, ...optionalParams: unknown[]): void {
		console.log(message, ...optionalParams);
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		// not console.error, which Bun paints red on a terminal, so a warning
		// or a progress line would read as a failure
		process.stderr.write(`${format(message, ...optionalParams)}\n`);
	}
}
