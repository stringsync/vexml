import { Tuplet, type TupletOptions } from 'vexflow/core';

/* A note value as <tuplet-type>/<normal-type> name it, with its dot count. */
export type TupletNoteValue = { type: string; dots: number };

export type DisplayTupletOptions = TupletOptions & {
	/* <tuplet show-number>: "none" prints no numeral, "both" is handled by `ratioed`. */
	showNumber?: 'actual' | 'both' | 'none' | null;
	/* <tuplet show-type>: which side(s) of the ratio get a note-value glyph beside the numeral. */
	showType?: 'actual' | 'both' | 'none' | null;
	actualValue?: TupletNoteValue | null;
	normalValue?: TupletNoteValue | null;
	/* <tuplet line-shape="curved">: arcs in place of the square bracket. */
	curved?: boolean;
	/* The square bracket's line width (`<line-width type="tuplet bracket">`); vexflow's 1px
	 * when absent. */
	bracketWidth?: number | null;
};

/* SMuFL metNote*Up glyphs, as metronome-glyph.ts draws them, and metAugmentationDot. */
const NOTE_GLYPHS: Record<string, string> = {
	breve: '\uECA0',
	whole: '\uECA2',
	half: '\uECA3',
	quarter: '\uECA5',
	eighth: '\uECA7',
	'16th': '\uECA9',
	'32nd': '\uECAB',
	'64th': '\uECAD',
	'128th': '\uECAF',
};
const DOT_GLYPH = '\uECB7';
const COLON_GLYPH = '\uE88A';
const DIGIT_BASE = 0xe880;

/* How far from the bracket's end the arc starts, away from the notes, as a fraction of a leg. */
const LEG = 10;
/* Air between the numeral and the line on either side, as vexflow leaves it. */
const TEXT_GAP = 5;

/*
 * A vexflow Tuplet that can print what MusicXML's <tuplet> asks for and vexflow's cannot: no
 * numeral at all (show-number="none"), note-value glyphs beside the numeral (show-type), and a
 * curved line (line-shape="curved"). With none of those set it draws exactly as Tuplet does.
 */
export class DisplayTuplet extends Tuplet {
	private readonly curved: boolean;
	private readonly bracketWidth: number | null;

	constructor(
		notes: ConstructorParameters<typeof Tuplet>[0],
		opts: DisplayTupletOptions = {},
	) {
		const {
			showNumber,
			showType,
			actualValue,
			normalValue,
			curved,
			bracketWidth,
			...rest
		} = opts;
		super(notes, rest);
		this.curved = curved ?? false;
		this.bracketWidth = bracketWidth ?? null;
		const ratioed = this.options.ratioed;
		const side = (
			number: number,
			value: TupletNoteValue | null,
			type: boolean,
		) =>
			(showNumber === 'none' ? '' : digits(number)) +
			(type && value ? glyphs(value) : '');
		const typeActual = showType === 'actual' || showType === 'both';
		const typeNormal = showType === 'both';
		if (showNumber === 'none' || typeActual) {
			const actual = side(
				this.options.numNotes,
				actualValue ?? null,
				typeActual,
			);
			const normal = side(
				this.options.notesOccupied,
				normalValue ?? null,
				typeNormal,
			);
			const showNormal =
				(ratioed && showNumber !== 'none') || (typeNormal && normal !== '');
			this.textElement.setText(
				actual + (showNormal ? COLON_GLYPH + normal : ''),
			);
		}
	}

	override draw(): void {
		if (
			!this.curved &&
			this.bracketWidth === null &&
			this.textElement.getText() !== ''
		) {
			super.draw();
			return;
		}
		const { location, bracketed, textYOffset } = this.options;
		const ctx = this.checkContext();
		const first = this.notes[0];
		const last = this.notes[this.notes.length - 1];
		if (!first || !last) {
			return;
		}
		let xPos: number;
		if (bracketed) {
			xPos = first.getTieLeftX() - 5;
			this.width = last.getTieRightX() - xPos + 5;
		} else {
			xPos = stemX(first);
			this.width = stemX(last) - xPos;
		}
		const yPos = this.getYPosition();
		const textWidth = this.textElement.getWidth();
		const center = xPos + this.width / 2;
		ctx.openGroup('tuplet', this.getAttribute('id'));
		if (bracketed) {
			const half = textWidth === 0 ? 0 : textWidth / 2 + TEXT_GAP;
			const run = this.width / 2 - half;
			if (run > 0) {
				if (this.curved) {
					this.arc(xPos, center - half, yPos, location);
					this.arc(xPos + this.width, center + half, yPos, location);
				} else {
					const width = this.bracketWidth ?? 1;
					if (half === 0) {
						// No numeral to split around: one unbroken line.
						ctx.fillRect(xPos, yPos, this.width, width);
					} else {
						ctx.fillRect(xPos, yPos, run, width);
						ctx.fillRect(center + half, yPos, run, width);
					}
					const legY = yPos + (location === Tuplet.LOCATION_BOTTOM ? width : 0);
					ctx.fillRect(xPos, legY, width, location * LEG);
					ctx.fillRect(xPos + this.width, legY, width, location * LEG);
				}
			}
		}
		if (textWidth > 0) {
			this.textElement.renderText(
				ctx,
				center - textWidth / 2,
				yPos +
					this.textElement.getHeight() / 2 +
					(location === Tuplet.LOCATION_TOP ? -1 : 1) * textYOffset,
			);
		}
		ctx.closeGroup();
		this.setRendered();
	}

	/*
	 * One half of the curved line: from the bracket's end, LEG toward the notes, sweeping out to
	 * the line's own height at `toX`. The ink is a thin lens (a second pass offset by a pixel),
	 * filled once, as CrispCurve does for slurs.
	 */
	private arc(
		fromX: number,
		toX: number,
		yPos: number,
		location: number,
	): void {
		const ctx = this.checkContext();
		const startY = yPos + location * LEG;
		const inward = toX > fromX ? 1 : -1;
		ctx.beginPath();
		ctx.moveTo(fromX, startY);
		ctx.quadraticCurveTo(fromX, yPos, toX, yPos);
		ctx.lineTo(toX, yPos + location);
		ctx.quadraticCurveTo(
			fromX + inward,
			yPos + location,
			fromX + inward,
			startY,
		);
		ctx.closePath();
		ctx.fill();
	}
}

function digits(n: number): string {
	let out = '';
	for (let rest = n; rest >= 1; rest = Math.floor(rest / 10)) {
		out = String.fromCharCode(DIGIT_BASE + (rest % 10)) + out;
	}
	return out;
}

function glyphs(value: TupletNoteValue): string {
	const note = NOTE_GLYPHS[value.type];
	return note ? note + DOT_GLYPH.repeat(value.dots) : '';
}

/* Tuplet types its notes as plain Notes, but the unbracketed form only ever sees stemmable ones. */
function stemX(note: {
	getStemX?: () => number;
	getAbsoluteX(): number;
}): number {
	return note.getStemX?.() ?? note.getAbsoluteX();
}
