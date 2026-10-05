/** How loudly a violation reports. */
export type Level = "error" | "warning";

const RETRIES = 3;

export class Reporter {
	report(level: Level): void {}
}
