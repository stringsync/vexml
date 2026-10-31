// Named, not inlined: it lets `strip` build its pattern without putting a
// control character in a regex literal.
const ESC = "\u001B";
// attribute-specific resets (39 = default fg, 22 = normal intensity) so nesting works
const FG_RESET = "39";
const INTENSITY_RESET = "22";

export class color {
	private constructor() {
		throw new Error("color is a static-only class and cannot be instantiated.");
	}

	static red(value: unknown): string {
		return color.wrap("31", FG_RESET, value);
	}

	static yellow(value: unknown): string {
		return color.wrap("33", FG_RESET, value);
	}

	static green(value: unknown): string {
		return color.wrap("32", FG_RESET, value);
	}

	static blue(value: unknown): string {
		return color.wrap("34", FG_RESET, value);
	}

	static magenta(value: unknown): string {
		return color.wrap("35", FG_RESET, value);
	}

	static dim(value: unknown): string {
		return color.wrap("2", INTENSITY_RESET, value);
	}

	static bold(value: unknown): string {
		return color.wrap("1", INTENSITY_RESET, value);
	}

	static gray(value: unknown): string {
		return color.wrap("90", FG_RESET, value);
	}

	/**
	 * Removes the color from a value, for output that is read rather than
	 * displayed: a test assertion, a log file, a pipe.
	 */
	static strip(value: unknown): string {
		// Only the sequences `wrap` writes.
		return String(value).replaceAll(new RegExp(`${ESC}\\[\\d+m`, "g"), "");
	}

	/**
	 * Read per call rather than once at import, so setting `NO_COLOR` takes
	 * effect wherever it is set (a test, a `--` wrapper) without caring
	 * whether this module was loaded first.
	 */
	private static wrap(code: string, reset: string, value: unknown): string {
		// any non-empty value counts as set (no-color.org)
		if (process.env.NO_COLOR) {
			return String(value);
		}
		return `${ESC}[${code}m${String(value)}${ESC}[${reset}m`;
	}
}
