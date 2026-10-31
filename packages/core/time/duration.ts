/**
 * A length of time, held as milliseconds. Durations are values: every operation
 * returns a new one, so passing one around cannot change it under the caller.
 * Taking a `Duration` rather than a bare number also stops the unit question
 * (seconds? millis?) from being asked at every call site.
 */
export class Duration {
	private constructor(private readonly _ms: number) {}

	static zero(): Duration {
		return new Duration(0);
	}

	static ms(ms: number): Duration {
		return new Duration(ms);
	}

	static secs(secs: number): Duration {
		return Duration.ms(secs * 1000);
	}

	static mins(mins: number): Duration {
		return Duration.secs(mins * 60);
	}

	static hrs(hrs: number): Duration {
		return Duration.mins(hrs * 60);
	}

	static days(days: number): Duration {
		return Duration.hrs(days * 24);
	}

	static min(...durations: Duration[]): Duration {
		return durations.reduce(
			(min, duration) => (duration.isLessThan(min) ? duration : min),
			Duration.ms(Number.POSITIVE_INFINITY),
		);
	}

	static max(...durations: Duration[]): Duration {
		return durations.reduce(
			(max, duration) => (duration.isGreaterThan(max) ? duration : max),
			Duration.ms(Number.NEGATIVE_INFINITY),
		);
	}

	get ms(): number {
		return this._ms;
	}

	get secs(): number {
		return this._ms / 1000;
	}

	get mins(): number {
		return this.secs / 60;
	}

	get hrs(): number {
		return this.mins / 60;
	}

	isEqual(other: Duration): boolean {
		return this._ms === other._ms;
	}

	isLessThan(other: Duration): boolean {
		return this._ms < other._ms;
	}

	isGreaterThan(other: Duration): boolean {
		return this._ms > other._ms;
	}

	isLessThanOrEqual(other: Duration): boolean {
		return this._ms <= other._ms;
	}

	isGreaterThanOrEqual(other: Duration): boolean {
		return this._ms >= other._ms;
	}

	add(other: Duration): Duration {
		return new Duration(this._ms + other._ms);
	}

	subtract(other: Duration): Duration {
		return new Duration(this._ms - other._ms);
	}

	multiply(factor: number): Duration {
		return new Duration(this._ms * factor);
	}

	clamp(min: Duration, max: Duration): Duration {
		return new Duration(Math.min(Math.max(this._ms, min._ms), max._ms));
	}

	negate(): Duration {
		return new Duration(-this._ms);
	}

	toString(): string {
		return `${this._ms}ms`;
	}

	/**
	 * Precision drops as the number grows, because nobody reading minutes cares
	 * about the milliseconds.
	 */
	human(): string {
		if (this._ms < 1000) {
			return `${Math.round(this._ms)}ms`;
		}
		if (this.secs < 60) {
			return `${this.secs.toFixed(1)}s`;
		}
		const mins = Math.floor(this.mins);
		return `${mins}m ${String(Math.round(this.secs - mins * 60)).padStart(2, "0")}s`;
	}
}
