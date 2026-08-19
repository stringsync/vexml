/*
 * One <technical> mark stacked off a note — a fingering/pluck label or a string-number
 * ring. The draw pass reads these off a note's modifiers to stack a chord's marks as one
 * column clear of the stave (SystemFormatter.pinTechnicals) and to keep the things drawn
 * above a note clear of the column (SystemFormatter.noteRect).
 *
 * The engraved implementation is TechnicalAnnotation, a vexflow Annotation. This interface
 * is only the part the draw pass touches, so a test can measure a note without vexflow's
 * text machinery.
 */
export interface TechnicalMark {
	/** Tells a technical mark apart from the other modifiers a note carries. */
	readonly kind: 'technical';
	/** Which side of the stave this mark stacks on (`<technical placement>`). */
	readonly below: boolean;
	/** How much vertical room this mark claims in its column, ink plus air. */
	rowHeight(): number;
	/** The mark's drawn width. */
	getWidth(): number;
	/** Draw the mark with its row's bottom edge at `y`, rather than where vexflow would
	 * stack it. */
	setBaselineY(y: number): void;
	/** The ink to draw the mark in. */
	setStyle(style: { fillStyle?: string }): void;
	/** The box the mark was drawn in; only its top edge is read. */
	getBoundingBox(): { getY(): number };
}

/** Whether `modifier` is a technical mark. Narrows in place, so filtering a note's
 * modifiers keeps whatever else the caller knows about them. */
export function isTechnicalMark<T>(modifier: T): modifier is T & TechnicalMark {
	return (modifier as TechnicalMark | null)?.kind === 'technical';
}
