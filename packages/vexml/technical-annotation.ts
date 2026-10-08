import { Annotation, Modifier } from 'vexflow/core';
import type { TechnicalMark } from './technical-mark';

/*
 * A <technical> mark that engraves as stacked text off the note: the fingering/pluck label
 * and the string-number ring. A chord's marks read as one COLUMN clear of the stave, in chord
 * order, which is how both MuseScore and OSMD engrave them.
 *
 * The column is positioned by the draw pass (SystemFormatter.pinTechnicals), the same arrangement
 * lyrics use: an Annotation for the text drawing and the width it reserves, but its own
 * baseline. vexflow's own stacking can't do it: Annotation.format hands every mark on a note
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

	/** Where the text's own baseline goes: the row's bottom edge, unless a subclass draws
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
