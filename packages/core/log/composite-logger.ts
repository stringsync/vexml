import type { Logger } from "./logger";

export class CompositeLogger implements Logger {
	constructor(private loggers: [Logger, ...Logger[]]) {}

	info(message: unknown, ...optionalParams: unknown[]): void {
		for (const logger of this.loggers) {
			logger.info(message, ...optionalParams);
		}
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		for (const logger of this.loggers) {
			logger.error(message, ...optionalParams);
		}
	}
}
