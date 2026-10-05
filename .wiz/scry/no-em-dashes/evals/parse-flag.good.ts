/** Parses a raw CLI string into a typed value. Throws on bad input. */
export function parse(raw: string): Value {
	return table.get(raw) ?? fail(raw);
}
