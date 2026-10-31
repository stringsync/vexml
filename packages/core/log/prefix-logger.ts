import { ConsoleLogger } from "./console-logger";
import type { Logger } from "./logger";

/** What a `PrefixLogger` writes through; the console by default. */
export interface PrefixLoggerOptions {
	log?: Logger;
}

export class PrefixLogger implements Logger {
	private log: Logger;

	constructor(
		private prefix: string,
		opts: PrefixLoggerOptions = {},
	) {
		this.log = opts.log ?? new ConsoleLogger();
	}

	info(message: unknown, ...optionalParams: unknown[]): void {
		this.log.info(`${this.prefix} ${message}`, ...optionalParams);
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		this.log.error(`${this.prefix} ${message}`, ...optionalParams);
	}
}
