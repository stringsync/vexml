export interface BackoffOptions {
	baseMs: number;
	maxMs: number;
	jitter: boolean;
}

export function backoffDelay(attempt: number, options: BackoffOptions): number {
	// Exponential growth, capped so a long outage does not stall for hours.
	const raw = Math.min(options.maxMs, options.baseMs * 2 ** attempt);
	if (!options.jitter) return raw;
	// Full jitter spreads retries from many clients across the window.
	return Math.floor(Math.random() * raw);
}

export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}
