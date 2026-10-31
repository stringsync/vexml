import { AssertError } from "./assert-error";

/**
 * Assertions that narrow the type of what they are given, for the invariants a
 * type cannot state. Each throws an `AssertError` when it does not hold.
 *
 * ```ts
 * assert.present(user, "no user on the session");
 * user.name; // narrowed
 * ```
 *
 * Use `ensure` instead when you want the value back rather than a narrowing.
 */
export class assert {
	private constructor() {}

	static that(condition: unknown, message?: string): asserts condition {
		if (!condition) {
			throw new AssertError(message);
		}
	}

	static number(value: unknown, message?: string): asserts value is number {
		assert.that(
			typeof value === "number",
			message ?? `expected a number, got: ${value}`,
		);
		assert.that(!Number.isNaN(value), message ?? "expected a number, got NaN");
	}

	static integer(value: unknown, message?: string): asserts value is number {
		assert.number(value, message);
		assert.that(
			Number.isInteger(value),
			message ?? `expected an integer, got: ${value}`,
		);
	}

	/** Inclusive of both bounds. */
	static inRange(
		value: unknown,
		min: number,
		max: number,
		message?: string,
	): asserts value is number {
		assert.number(value, message);
		assert.that(
			value >= min && value <= max,
			message ?? `expected a value within [${min}, ${max}], got: ${value}`,
		);
	}

	static notNull<T>(
		value: T,
		message?: string,
	): asserts value is Exclude<T, null> {
		assert.that(value !== null, message ?? "expected a value, got null");
	}

	static defined<T>(
		value: T,
		message?: string,
	): asserts value is Exclude<T, undefined> {
		assert.that(
			value !== undefined,
			message ?? "expected a value, got undefined",
		);
	}

	static present<T>(
		value: T,
		message?: string,
	): asserts value is Exclude<T, null | undefined> {
		assert.notNull(value, message);
		assert.defined(value, message);
	}

	/** States that control cannot reach here, e.g. the default of an exhaustive switch. */
	static unreachable(message?: string): never {
		throw new AssertError(message ?? "expected to be unreachable");
	}
}
