import { Rect } from 'webappwiz/geometry';

/*
 * One stave of one part's measure, as engraved: where its lines sit, in score space (the space
 * every element's rect is in). Plain data, not an Element: it is never hit or decorated, only
 * read, e.g. to label the lines and spaces beside a staff.
 */
export class Stave {
	constructor(
		private readonly number: number,
		private readonly lines: readonly number[],
		private readonly left: number,
		private readonly right: number,
		private readonly noteStartX: number,
	) {}

	/* The 1-based stave within its part, as Voice.getStave() names it. */
	getNumber(): number {
		return this.number;
	}

	/* The y of each staff line, top to bottom: five on a standard stave, as many as the
	 * document's staff-details asks for otherwise (six on a guitar tab). */
	getLineYs(): number[] {
		return [...this.lines];
	}

	/* From the stave's left edge to its right, and from its top line to its bottom one. */
	getRect(): Rect {
		const top = this.lines[0] ?? 0;
		const bottom = this.lines[this.lines.length - 1] ?? top;
		return new Rect(this.left, top, this.right - this.left, bottom - top);
	}

	/* Where the music begins: right of any clef, key and time signature the measure opens with. */
	getNoteStartX(): number {
		return this.noteStartX;
	}
}
