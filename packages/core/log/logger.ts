/** The logging seam. Typically assigned the variable name `log`. */
export interface Logger {
	info(message: unknown, ...optionalParams: unknown[]): void;
	error(message: unknown, ...optionalParams: unknown[]): void;
}

export type LogLevel = "info" | "error";

export interface LogEntry {
	level: LogLevel;
	message: unknown;
	optionalParams: unknown[];
	timestamp: Date;
}
