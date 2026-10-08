import { Stroke } from 'vexflow/core';

/*
 * The square bracket of a <notations><non-arpeggiate>, drawn to the left of a chord: a
 * vertical spine with a hook at each end, both pointing right at the noteheads. vexflow's
 * Stroke has no bracket type, so this subclasses it purely to inherit the placement:
 * Stroke.format reserves the width and shifts the whole stack clear of accidentals, and it
 * dispatches on CATEGORY, which a subclass keeps, and replaces the wiggle in draw().
 */
export class NonArpeggioBracket extends Stroke {
	constructor(
		private readonly lowIndex: number,
		private readonly highIndex: number,
	) {
		// The type is never read (draw is overridden), but Stroke's constructor needs one.
		super(Stroke.Type.ARPEGGIO_DIRECTIONLESS);
	}

	override draw(): void {
		const ctx = this.checkContext();
		const note = this.checkAttachedNote();
		this.setRendered();
		// Only the noteheads the mark actually spans: a non-arpeggiate whose type="bottom"
		// and type="top" name inner members brackets that part of the chord alone.
		const ys = note
			.getYs()
			.slice(this.lowIndex, this.highIndex + 1)
			.filter((y) => Number.isFinite(y));
		if (ys.length === 0) {
			return;
		}
		const lineSpace = note.checkStave().getSpacingBetweenLines();
		// Overhang the outer noteheads by half a staff space, the way the arpeggio wiggle
		// does, so the bracket reads as enclosing them rather than touching them.
		const top = Math.min(...ys) - lineSpace / 2;
		const bottom = Math.max(...ys) + lineSpace / 2;
		const x =
			note.getModifierStartXY(this.position, this.index).x - 5 + this.xShift;
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
