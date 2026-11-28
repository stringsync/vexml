import type { Note as VexNote } from 'vexflow/core';
import { Stroke } from 'vexflow/core';

export type NonArpeggioEnd = 'top' | 'bottom' | 'both';

/*
 * The square bracket of a <notations><non-arpeggiate>, drawn to the left of a chord: a
 * vertical spine with a hook at each end, both pointing right at the noteheads. vexflow's
 * Stroke has no bracket type, so this subclasses it purely to inherit the placement:
 * Stroke.format reserves the width and shifts the whole stack clear of accidentals, and it
 * dispatches on CATEGORY, which a subclass keeps, and replaces the wiggle in draw().
 *
 * When a non-arpeggiate spans staves (type="top" on an upper staff and type="bottom" on a
 * lower staff with the same number), each chord still carries one of these so both staves
 * reserve the same width; DrawPass joins the lower end onto the upper one so only the top
 * chord draws a single continuous bracket across both staves.
 */
export class NonArpeggioBracket extends Stroke {
	private readonly below: Array<{
		bracket: NonArpeggioBracket;
		note: VexNote;
	}> = [];
	private drawsBracket = true;

	constructor(
		private readonly lowIndex: number,
		private readonly highIndex: number,
		readonly end: NonArpeggioEnd = 'both',
		readonly number = 1,
	) {
		// The type is never read (draw is overridden), but Stroke's constructor needs one.
		super(Stroke.Type.ARPEGGIO_DIRECTIONLESS);
	}

	/* Join `lower`'s bracket to this one: this chord draws the continuous bracket, `lower` stays quiet. */
	join(lower: NonArpeggioBracket, lowerNote: VexNote): void {
		lower.drawsBracket = false;
		this.below.push({ bracket: lower, note: lowerNote });
	}

	private spannedYs(note: VexNote): number[] {
		// Only the noteheads the mark actually spans: a non-arpeggiate whose type="bottom"
		// and type="top" name inner members brackets that part of the chord alone.
		return note
			.getYs()
			.slice(this.lowIndex, this.highIndex + 1)
			.filter((y) => Number.isFinite(y));
	}

	private bracketX(note: VexNote): number {
		return (
			note.getModifierStartXY(this.position, this.index).x - 5 + this.xShift
		);
	}

	override draw(): void {
		if (!this.drawsBracket) {
			this.setRendered();
			return;
		}
		const ctx = this.checkContext();
		const note = this.checkAttachedNote();
		this.setRendered();
		const ys = [
			...this.spannedYs(note),
			...this.below.flatMap(({ bracket, note: lowerNote }) =>
				bracket.spannedYs(lowerNote),
			),
		];
		if (ys.length === 0) {
			return;
		}
		const lineSpace = note.checkStave().getSpacingBetweenLines();
		// Overhang the outer noteheads by half a staff space, the way the arpeggio wiggle
		// does, so the bracket reads as enclosing them rather than touching them.
		const top = Math.min(...ys) - lineSpace / 2;
		const bottom = Math.max(...ys) + lineSpace / 2;
		const x = Math.min(
			this.bracketX(note),
			...this.below.map(({ bracket, note: lowerNote }) =>
				bracket.bracketX(lowerNote),
			),
		);
		const hook = lineSpace * 0.6;
		ctx.fillRect(x, top, NON_ARPEGGIATE_THICKNESS, bottom - top);
		ctx.fillRect(x, top, hook, NON_ARPEGGIATE_THICKNESS);
		ctx.fillRect(
			x,
			bottom - NON_ARPEGGIATE_THICKNESS,
			hook,
			NON_ARPEGGIATE_THICKNESS,
		);
	}
}

const NON_ARPEGGIATE_THICKNESS = 1.5;
