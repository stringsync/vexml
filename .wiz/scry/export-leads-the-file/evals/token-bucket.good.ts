export interface TokenBucketOptions {
	capacity: number;
	refillPerSecond: number;
}

const MS_PER_SECOND = 1000;

export class TokenBucket {
	private tokens: number;
	private refilledAt = Date.now();

	constructor(private options: TokenBucketOptions) {
		this.tokens = options.capacity;
	}

	take(count = 1): boolean {
		this.refill();
		if (this.tokens < count) return false;
		this.tokens -= count;
		return true;
	}

	private refill(): void {
		const now = Date.now();
		const earned = ((now - this.refilledAt) / MS_PER_SECOND) * this.options.refillPerSecond;
		this.tokens = Math.min(this.options.capacity, this.tokens + earned);
		this.refilledAt = now;
	}
}
