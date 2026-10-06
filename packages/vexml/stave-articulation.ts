import { Articulation, Modifier, Stem } from 'vexflow';

/*
 * An articulation that clears the beam.
 *
 * vexflow parks a stem-side mark half a stave space off the STEM TIP, which on a beamed note
 * is exactly where the beam's ink starts: half a space of air reads as clearance over a thin
 * stem, but as a mark resting on the beam. Lift it another space when the note is beamed,
 * which is roughly what MuseScore engraves. The beam extends AWAY from the mark (down from a
 * stem-up tip), so its thickness costs nothing and the beam count doesn't matter.
 *
 * Applied by shifting the text line for the duration of the draw rather than at format time:
 * vexflow's Articulation.format has no view of the beam, and a note can be drawn more than
 * once (the spill pass), so a persistent bump would ratchet.
 */
export class StaveArticulation extends Articulation {
	override draw(): void {
		const note = this.checkAttachedNote();
		const onStemTip =
			this.position ===
			(note.getStemDirection() === Stem.UP
				? Modifier.Position.ABOVE
				: Modifier.Position.BELOW);
		if (!note.hasBeam() || !onStemTip) {
			super.draw();
			return;
		}
		const line = this.textLine;
		this.setTextLine(line + 1);
		super.draw();
		this.setTextLine(line);
	}
}
