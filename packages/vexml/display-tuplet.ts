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
};

/* SMuFL metNote*Up glyphs, as metronome-glyph.ts draws them, and metAugmentationDot. */
const NOTE_GLYPHS: Record<string, string> = {
	breve: '',
	whole: '',
	half: '',
	quarter: '',
	eighth: '',
	'16th': '',
	'32nd': '',
	'64th': '',
	'128th': '',
};
const DOT_GLYPH = '';
const COLON_GLYPH = '';
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

	constructor(
		notes: ConstructorParameters<typeof Tuplet>[0],
		options: DisplayTupletOptions = {},
	) {
		const { showNumber, showType, actualValue, normalValue, curved, ...rest } =
			options;
		super(notes, rest);
		this.curved = curved ?? false;
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
		if (!this.curved && this.textElement.getText() !== '') {
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
					// No numeral to split around: one unbroken line.
					ctx.fillRect(xPos, yPos, this.width, 1);
					ctx.fillRect(
						xPos,
						yPos + (location === Tuplet.LOCATION_BOTTOM ? 1 : 0),
						1,
						location * LEG,
					);
					ctx.fillRect(
						xPos + this.width,
						yPos + (location === Tuplet.LOCATION_BOTTOM ? 1 : 0),
						1,
						location * LEG,
					);
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
