/** Compares two values by their own enumerable keys, one level deep. */
export function shallowEqual<T>(left: T, right: T): boolean {
	if (Object.is(left, right)) {
		return true;
	}
	if (
		typeof left !== "object" ||
		typeof right !== "object" ||
		left === null ||
		right === null
	) {
		return false;
	}
	const keysLeft = Object.keys(left);
	const keysRight = Object.keys(right);
	if (keysLeft.length !== keysRight.length) {
		return false;
	}
	return keysLeft.every(
		(key) =>
			Object.hasOwn(right, key) &&
			Object.is(
				(left as Record<string, unknown>)[key],
				(right as Record<string, unknown>)[key],
			),
	);
}
