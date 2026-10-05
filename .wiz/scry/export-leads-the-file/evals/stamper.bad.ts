export interface StamperOptions {
	clock: Clock;
	format: StampFormat;
	window: StampWindow;
	retries: number;
}

export interface StampFormat {
	zone: string;
	precision: "seconds" | "milliseconds";
	separator: string;
	prefix: string;
	suffix: string;
}

export interface StampWindow {
	from: Date;
	until: Date;
	inclusive: boolean;
}

export interface StampResult {
	text: string;
	at: Date;
	attempts: number;
	window: StampWindow;
}

export interface StampError {
	code: "clock" | "format" | "window";
	message: string;
	at: Date;
}

export type StampListener = (result: StampResult) => void;

export type StampFailure = (error: StampError) => void;

export interface StampEvents {
	stamped: StampResult;
	failed: StampError;
}

export const DEFAULT_FORMAT: StampFormat = {
	zone: "UTC",
	precision: "seconds",
	separator: " ",
	prefix: "",
	suffix: "",
};

export class Stamper {}
