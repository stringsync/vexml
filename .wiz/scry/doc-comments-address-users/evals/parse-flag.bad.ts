/**
 * Parses a raw CLI string. Uses a Map internally instead of a switch.
 * TODO: revisit after the flag-parsing refactor lands.
 */
export function parse(raw: string): Value {
	return table.get(raw) ?? fail(raw);
}
