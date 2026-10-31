import type { LogEntry, Logger } from "./logger";

export class MemoryLogger implements Logger {
	readonly entries: LogEntry[] = [];

	info(message: unknown, ...optionalParams: unknown[]): void {
		this.entries.push(this.createEntry("info", message, optionalParams));
	}

	error(message: unknown, ...optionalParams: unknown[]): void {
		this.entries.push(this.createEntry("error", message, optionalParams));
	}

	clear(): void {
		this.entries.length = 0;
	}

	private createEntry(
		level: LogEntry["level"],
		message: unknown,
		optionalParams: unknown[],
	): LogEntry {
		return { level, message, optionalParams, timestamp: new Date() };
	}
}
