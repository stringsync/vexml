import { Annotation, Modifier } from 'vexflow';
import {
	FINGERING_FONT_SIZE,
	STRING_NUMBER_DIGIT_RISE,
	STRING_NUMBER_FONT_SIZE,
	STRING_NUMBER_RADIUS,
	STRING_NUMBER_RING_WIDTH,
	TECHNICAL_ROW_GAP,
} from '../constants';
import type { TechnicalMark } from './technical-mark';

/*
 * A <technical> mark that engraves as stacked text off the note — the fingering/pluck label
 * and the string-number ring. A chord's marks read as one COLUMN clear of the stave, in chord
 * order, which is how both MuseScore and OSMD engrave them.
 *
 * The column is positioned by the draw pass (SystemFormatter.pinTechnicals), the same arrangement
 * lyrics use: an Annotation for the text drawing and the width it reserves, but its own
 * baseline. vexflow's own stacking can't do it — Annotation.format hands every mark on a note
 * LOW in the stave the same text line, so they print through each other, and its
 * FretHandFinger/StringNumber each keep separate text-line accounting measured from their own
 * anchor, so two of them on one note collide too.
 */
export abstract class TechnicalAnnotation
	extends Annotation
	implements TechnicalMark
{
	readonly kind = 'technical' as const;

	protected baselineY = 0;

	constructor(
		text: string,
		/** Which side of the stave this mark stacks on (<technical placement>). */
		readonly below: boolean,
	) {
		super(text);
		this.setVerticalJustification(
			below
				? Annotation.VerticalJustify.BOTTOM
				: Annotation.VerticalJustify.TOP,
		);
	}

	/** How much vertical room this mark claims in its column, ink plus air. */
	abstract rowHeight(): number;

	setBaselineY(y: number): void {
		this.baselineY = y;
	}

	/** Where the text's own baseline goes — the row's bottom edge, unless a subclass draws
	 * something around the text that it has to sit inside. */
	protected textBaselineY(): number {
		return this.baselineY;
	}

	override draw(): void {
		const ctx = this.checkContext();
		const note = this.checkAttachedNote();
		this.setRendered();
		// Center on the notehead, the same horizontal treatment a CENTER-justified
		// Annotation gets; only the vertical placement is ours.
		const start = note.getModifierStartXY(Modifier.Position.ABOVE, this.index);
		this.x = start.x - this.getWidth() / 2;
		this.y = this.textBaselineY();
		this.renderText(ctx, 0, 0);
	}
}

/* A <fingering>/<pluck> label. */
export class FingeringAnnotation extends TechnicalAnnotation {
	constructor(text: string, below: boolean) {
		super(text, below);
		this.setFontSize(FINGERING_FONT_SIZE);
	}

	override rowHeight(): number {
		return FINGERING_FONT_SIZE + TECHNICAL_ROW_GAP;
	}
}

/* A <string> indicator: the string's number in a ring. */
export class StringNumberAnnotation extends TechnicalAnnotation {
	constructor(number: string, below: boolean) {
		super(number, below);
		this.setFontSize(STRING_NUMBER_FONT_SIZE);
	}

	override rowHeight(): number {
		return 2 * STRING_NUMBER_RADIUS + TECHNICAL_ROW_GAP;
	}

	/* The ring fills its whole row, so its center is one radius up from the row's bottom. */
	private ringCenterY(): number {
		return this.baselineY - STRING_NUMBER_RADIUS;
	}

	/* The digit sits inside the ring, not on the row's baseline. */
	protected override textBaselineY(): number {
		return this.ringCenterY() + STRING_NUMBER_DIGIT_RISE;
	}

	override draw(): void {
		super.draw();
		const ctx = this.checkContext();
		ctx.beginPath();
		ctx.arc(
			this.getX() + this.getWidth() / 2,
			this.ringCenterY(),
			STRING_NUMBER_RADIUS,
			0,
			2 * Math.PI,
			false,
		);
		ctx.setLineWidth(STRING_NUMBER_RING_WIDTH);
		ctx.stroke();
	}
}
