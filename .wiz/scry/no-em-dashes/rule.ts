import type { Finding, Rule, SourceFile, Span } from "@webappwiz/scry";

/** An em dash, anywhere. */
const EM_DASH = /\u2014/g;

/** An en dash with no number on one side of it: between words, not a range. */
const EN_DASH_BETWEEN_WORDS = /(?<!\d\s?)\u2013|\u2013(?!\s?\d)/g;

/** Finds em dashes, and en dashes between words, on any line of a file. */
export default class NoEmDashes implements Rule {
	static readonly description =
		"No em dashes, and no en dashes between words, in code, comments or prose.";
	static readonly files = "**/*.{ts,tsx,md}";
	static readonly level = "error";
	static readonly recommended = true;

	async check(file: SourceFile): Promise<Finding[]> {
		return this.oncePerLine([
			...file.matches(EM_DASH),
			...file.matches(EN_DASH_BETWEEN_WORDS),
		]).map((dash) =>
			dash.flag(
				"Replace the dash with a colon, a comma, parentheses or a full stop.",
			),
		);
	}

	/** A line with two dashes is one thing to fix. */
	private oncePerLine(dashes: Span[]): Span[] {
		const lines = new Map(dashes.map((dash) => [dash.line, dash]));
		return [...lines.values()].toSorted(
			(left, right) => left.line - right.line,
		);
	}
}
