/** Parses a raw CLI string — throws on bad input — into a typed value. */
export function parse(raw: string): Value {
	return table.get(raw) ?? fail(raw);
}
