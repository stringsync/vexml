/** Parses a raw CLI string into a typed value. Throws on bad input. */
export function parse(raw: string): Value {
	// Map lookup beats a switch here: options arrive in registration order.
	return table.get(raw) ?? fail(raw);
}
