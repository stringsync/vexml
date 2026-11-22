import { Rect } from 'core/geometry';
import type { RawKeyAccidental } from './geometry-collector';

/* One sharp, flat or cancelling natural of the key signature a stave opens with. */
export interface KeyAccidental {
	/* The step it marks, 'C' to 'B'. */
	step: string;
	/* 1 a sharp, -1 a flat, 0 a natural cancelling the key before it (2 and -2 doubled, or the
	 * <key-alter> a custom key writes). */
	alter: number;
	/* Its glyph's box, in score space. */
	rect: Rect;
}

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
		private readonly keyAccidentals: readonly RawKeyAccidental[],
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

	/* Each accidental the key signature it opens with drew, left to right; none when it opens
	 * with no key signature. */
	getKeyAccidentals(): KeyAccidental[] {
		return this.keyAccidentals.map(({ step, alter, x, y, w, h }) => ({
			step,
			alter,
			rect: new Rect(x, y, w, h),
		}));
	}
}
