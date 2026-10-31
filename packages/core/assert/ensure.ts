import { assert } from "./assert";

/**
 * The assertions of `assert`, each returning the value it checked, so they can
 * be used where a value is expected rather than as a statement of their own.
 *
 * ```ts
 * const port = ensure.integer(raw, "PORT must be a whole number");
 * ```
 */
export class ensure {
	private constructor() {}

	static number(value: unknown, message?: string): number {
		assert.number(value, message);
		return value;
	}

	static integer(value: unknown, message?: string): number {
		assert.integer(value, message);
		return value;
	}

	/** Inclusive of both bounds. */
	static inRange(
		value: unknown,
		min: number,
		max: number,
		message?: string,
	): number {
		assert.inRange(value, min, max, message);
		return value;
	}

	static notNull<T>(value: T, message?: string): Exclude<T, null> {
		assert.notNull(value, message);
		return value;
	}

	static defined<T>(value: T, message?: string): Exclude<T, undefined> {
		assert.defined(value, message);
		return value;
	}

	static present<T>(value: T, message?: string): Exclude<T, null | undefined> {
		assert.present(value, message);
		return value;
	}
}
