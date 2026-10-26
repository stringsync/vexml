import type { RenderContext, Stave } from 'vexflow/core';
import { Element, TimeSignature } from 'vexflow/core';
import { Ink } from './ink';

/** One stacked meter: a numerator over either digits or a (dotted) note glyph. */
export type TimeFace = {
	beats: string;
	beatType: string;
	/** What stands in for the denominator digits; null prints the digits. */
	note: 'note' | 'dotted-note' | null;
};

/** The second meter of an `<interchangeable>` and how it joins the first. */
export type TimeInterchange = {
	relation: string | null;
	face: TimeFace;
};

export type ExtendedTimeSpec = {
	/** One face per beats/beat-type pair, joined by a plus sign. */
	faces: TimeFace[];
	interchange: TimeInterchange | null;
};

// SMuFL code points vexflow's Glyphs enum has but does not export.
const GLYPH = {
	noteWhole: '\uE1D2',
	noteHalfUp: '\uE1D3',
	noteQuarterUp: '\uE1D5',
	noteEighthUp: '\uE1D7',
	note16thUp: '\uE1D9',
	note32ndUp: '\uE1DB',
	augmentationDot: '\uE1E7',
	timeSigParensLeft: '\uE094',
	timeSigParensRight: '\uE095',
	timeSigBracketLeft: '\uEC80',
	timeSigBracketRight: '\uEC81',
	timeSigEquals: '\uE08F',
	timeSigFractionalSlash: '\uE08E',
	timeSigMinus: '\uE090',
	timeSigPlus: '\uE08C',
};

// The denominator note, built from a head, a drawn stem and a flag: the stemmed note glyphs
// are not in the music font vexflow ships, only the heads and flags.
const NOTE_HEADS: Record<string, { head: string; flag: string | null }> = {
	'1': { head: '\uE0A2', flag: null },
	'2': { head: '\uE0A3', flag: null },
	'4': { head: '\uE0A4', flag: null },
	'8': { head: '\uE0A4', flag: '\uE240' },
	'16': { head: '\uE0A4', flag: '\uE242' },
	'32': { head: '\uE0A4', flag: '\uE244' },
};

// The denominator note is drawn smaller than the digits so its stem fits under the numerator.
const NOTE_SCALE = 0.85;
const STEM_SPACES = 1.8;
const GAP = 6;

type Piece = {
	element: Element;
	x: number;
	line: 'top' | 'bottom' | 'middle' | 'base';
	/** A stem rising from the right edge of this element, in staff spaces. */
	stem?: number;
	/** Raised this many staff spaces above its line. */
	lift?: number;
};

/*
 * A time signature vexflow's own spec string cannot express: a note glyph as the denominator
 * (symbol="note" / "dotted-note") and a second, interchangeable meter beside the first. Plain
 * signatures keep vexflow's TimeSignature; this subclass only exists so the stave still sees a
 * TimeSignature category (system alignment squares it up with the others).
 */
export class ExtendedTimeSignature extends TimeSignature {
	private readonly pieces: Piece[] = [];
	private readonly lineOffset: number;

	constructor(spec: ExtendedTimeSpec) {
		// The base constructor lays out '4/4'; the pieces below replace that.
		super('4/4');
		let x = 0;
		let tallest = 0;
		const place = (face: TimeFace) => {
			const column = this.column(face);
			for (const piece of column.pieces) {
				piece.x += x;
				this.pieces.push(piece);
			}
			tallest = Math.max(tallest, column.height);
			x += column.width;
		};
		spec.faces.forEach((face, index) => {
			if (index > 0) {
				x += this.add(GLYPH.timeSigPlus, x, 'middle');
			}
			place(face);
		});
		if (spec.interchange) {
			const { relation, face } = spec.interchange;
			const [open, close] = this.joiner(relation);
			x += GAP;
			if (open) {
				x += this.add(open, x, 'middle');
			}
			place(face);
			if (close) {
				x += this.add(close, x, 'middle');
			}
		}
		this.width = x;
		this.lineOffset = tallest > 30 ? 0.5 : 0;
	}

	// The base constructor calls this before the pieces exist; the base layout is then moot.
	override setTimeSig(timeSpec: string): this {
		if (this.pieces) {
			return this;
		}
		return super.setTimeSig(timeSpec);
	}

	override drawAt(ctx: RenderContext, stave: Stave, x: number): void {
		this.setRendered();
		for (const { element, x: dx, line, stem, lift } of this.pieces) {
			const y =
				stave.getYForLine(this.lineOf(line)) -
				(lift ?? 0) * stave.getSpacingBetweenLines();
			element.renderText(ctx, x + dx, y);
			if (stem) {
				const space = stave.getSpacingBetweenLines();
				const width = Math.max(1, space * 0.17);
				const left = x + dx + element.getWidth() - width;
				ctx.save();
				ctx.setFillStyle(Ink.NOTATION);
				ctx.fillRect(left, y - stem * space, width, stem * space);
				ctx.restore();
			}
		}
	}

	private lineOf(line: Piece['line']): number {
		if (line === 'top') {
			return this.topLine - this.lineOffset;
		}
		if (line === 'base') {
			// The notehead sits on the bottom line, its stem rising under the numerator.
			return 4;
		}
		return line === 'bottom' ? this.bottomLine + this.lineOffset : 2;
	}

	// The glyphs that open and close the interchangeable meter, by <time-relation>.
	private joiner(relation: string | null): [string | null, string | null] {
		switch (relation) {
			case 'parentheses':
				return [GLYPH.timeSigParensLeft, GLYPH.timeSigParensRight];
			case 'bracket':
				return [GLYPH.timeSigBracketLeft, GLYPH.timeSigBracketRight];
			case 'equals':
				return [GLYPH.timeSigEquals, null];
			case 'slash':
				return [GLYPH.timeSigFractionalSlash, null];
			case 'hyphen':
				return [GLYPH.timeSigMinus, null];
			default:
				return [null, null];
		}
	}

	private add(text: string, x: number, line: Piece['line']): number {
		const element = new Element();
		element.setText(text);
		this.pieces.push({ element, x, line });
		return element.getWidth() + GAP;
	}

	private column(face: TimeFace): {
		pieces: Piece[];
		width: number;
		height: number;
	} {
		const top = this.textOf(face.beats, true);
		const note = face.note ? NOTE_HEADS[face.beatType] : undefined;
		const bottom = note ? this.noteOf(face, note) : null;
		if (!bottom) {
			const digits = this.textOf(face.beatType, true);
			const width = Math.max(top.getWidth(), digits.getWidth());
			return {
				pieces: [
					{ element: top, x: (width - top.getWidth()) / 2, line: 'top' },
					{
						element: digits,
						x: (width - digits.getWidth()) / 2,
						line: 'bottom',
					},
				],
				width,
				height: Math.max(top.getHeight(), digits.getHeight()),
			};
		}
		const width = Math.max(top.getWidth(), bottom.width);
		const shift = (width - bottom.width) / 2;
		return {
			pieces: [
				{ element: top, x: (width - top.getWidth()) / 2, line: 'top' },
				...bottom.pieces.map((piece) => ({ ...piece, x: piece.x + shift })),
			],
			width,
			height: top.getHeight(),
		};
	}

	private textOf(digits: string, small: boolean): Element {
		let text = '';
		for (const digit of digits) {
			text += TimeSignature.getTimeSigCode(digit, small);
		}
		const element = new Element();
		element.setText(text);
		return element;
	}

	// A head on the stave's bottom line, a stem rising from it, then its flag and dot.
	private noteOf(
		face: TimeFace,
		note: { head: string; flag: string | null },
	): { pieces: Piece[]; width: number } {
		const glyph = (text: string) => {
			const element = new Element();
			element.setText(text);
			const size = element.fontInfo.size;
			element.setFontSize(
				(typeof size === 'number' ? size : Number.parseFloat(size)) *
					NOTE_SCALE,
			);
			return element;
		};
		const head = glyph(note.head);
		const stemmed = face.beatType !== '1';
		const pieces: Piece[] = [
			{
				element: head,
				x: 0,
				line: 'base',
				stem: stemmed ? STEM_SPACES : undefined,
			},
		];
		let width = head.getWidth();
		if (note.flag) {
			const flag = glyph(note.flag);
			pieces.push({
				element: flag,
				x: head.getWidth() - 1,
				line: 'base',
				lift: STEM_SPACES,
			});
			width = head.getWidth() - 1 + flag.getWidth();
		}
		if (face.note === 'dotted-note') {
			const dot = glyph('\uE1E7');
			pieces.push({ element: dot, x: width + 2, line: 'base', lift: 0.5 });
			width += 2 + dot.getWidth();
		}
		return { pieces, width };
	}
}
