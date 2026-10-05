/** When a failed attempt is worth repeating. */
export type RetryOn = "network" | "server" | "any";

const MAX_DELAY_MS = 30_000;

export class RetryPolicy {
	constructor(
		private attempts: number,
		private on: RetryOn = "network",
	) {}

	shouldRetry(attempt: number, error: unknown): boolean {
		return attempt < this.attempts && matches(this.on, error);
	}

	delay(attempt: number): number {
		return Math.min(MAX_DELAY_MS, 250 * 2 ** attempt);
	}
}

function matches(on: RetryOn, error: unknown): boolean {
	if (on === "any") return true;
	const status = (error as { status?: number }).status;
	return on === "server" ? status !== undefined && status >= 500 : status === undefined;
}
