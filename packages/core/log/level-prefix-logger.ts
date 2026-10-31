import { ConsoleLogger } from "./console-logger";
import type { Logger } from "./logger";
import { PrefixLogger } from "./prefix-logger";

/** What a `LevelPrefixLogger` writes through; the console by default. */
export interface LevelPrefixLoggerOptions {
	log?: Logger;
}

export class LevelPrefixLogger implements Logger {
	private infoLogger: PrefixLogger;
	private errorLogger: PrefixLogger;

	constructor(opts: LevelPrefixLoggerOptions = {}) {
		const log = opts.log ?? new ConsoleLogger();
		this.infoLogger = new PrefixLogger("[INFO]", { log });
		this.errorLogger = new PrefixLogger("[ERROR]", { log });
	}

	info(message: unknown, ...optionalParams: unknown[]): void {
		this.infoLogger.info(message, ...optionalParams);
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		this.errorLogger.error(message, ...optionalParams);
	}
}
