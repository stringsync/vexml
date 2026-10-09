/*
 * The colors the engraving's inks resolve to when its ops are painted. The draw pass records ink
 * by role (notation, text, ledger lines) rather than as a color, so the same recording, and the
 * same snapshot, paints in any theme: the colors come from config at paint time.
 *
 * A role is a string no canvas takes for a color, so the recording keeps it as is (see
 * PaintContext.setProp), and every replay hands the canvas this ink's color for it instead.
 */
export class Ink {
	static readonly NOTATION = 'vexml-ink:notation';
	static readonly TEXT = 'vexml-ink:text';
	static readonly LEDGER = 'vexml-ink:ledger';

	/* Black notation and text, and vexflow's own gray ledger lines. */
	static readonly DEFAULT = new Ink(null, null);

	/** @param notation the engraved glyphs, staves and stems, or null for black.
	 * @param text the words vexml types, or null for black. */
	constructor(
		readonly notation: string | null,
		readonly text: string | null,
	) {}

	static isRole(value: unknown): boolean {
		return value === Ink.NOTATION || value === Ink.TEXT || value === Ink.LEDGER;
	}

	/* The color a style value paints with: a role's color, anything else as it is. Ledger lines
	 * keep vexflow's gray until a notation color is set, and then take it, as the stems do. */
	resolve(value: unknown): unknown {
		switch (value) {
			case Ink.NOTATION:
				return this.notation ?? '#000000';
			case Ink.TEXT:
				return this.text ?? '#000000';
			case Ink.LEDGER:
				return this.notation ?? '#444';
			default:
				return value;
		}
	}

	equals(other: Ink): boolean {
		return this.notation === other.notation && this.text === other.text;
	}
}
