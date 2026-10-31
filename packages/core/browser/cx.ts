/** Anything `cx` knows how to turn into class names. Falsy parts are skipped. */
export type ClassValue =
	| string
	| number
	| null
	| undefined
	| false
	| ClassValue[]
	| { [key: string]: unknown };

/**
 * Builds a class name string out of strings, arrays and objects, dropping
 * everything falsy.
 *
 * ```ts
 * cx("btn", isPrimary && "btn-primary", { "btn-lg": size === "lg" });
 * ```
 */
export function cx(...values: ClassValue[]): string {
	const names: string[] = [];
	for (const value of values) {
		// Falsy parts are dropped before anything else, so a `count && "badge"`
		// guard contributes nothing rather than the class name "0".
		if (!value) {
			continue;
		}
		const part = toValue(value);
		if (part) {
			names.push(part);
		}
	}
	return names.join(" ");
}

function toValue(value: ClassValue): string {
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return cx(...value);
	}
	// The falsy guard in `cx` has already dropped null, but a nested array
	// recurses through here, so narrowing still has to rule it out.
	if (typeof value === "object" && value !== null) {
		return Object.keys(value)
			.filter((key) => value[key])
			.join(" ");
	}
	return "";
}
