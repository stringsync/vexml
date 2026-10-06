import { Modifier, type StaveNote, Stem } from 'vexflow';
import { StaveArticulation } from './stave-articulation';

/*
 * An articulation that sits opposite the stem: BELOW for a stem-up note, ABOVE otherwise.
 *
 * The side isn't final when the mark is built: a beamed note's stem direction is only
 * settled once its Beam is, so the beam pass re-runs {@link setSide} (see
 * SpannerBuilder.reorientArticulations). vexflow's own codes flip their glyph on reset();
 * the raw SMuFL ones have to have the mirrored glyph swapped in, which is what the pair is
 * for. Fermatas take their side from their type instead, so they stay plain Articulations
 * and this pass leaves them alone.
 */
export class NoteheadArticulation extends StaveArticulation {
	private readonly codes: [above: string, below: string];

	constructor(code: string | [above: string, below: string]) {
		const codes: [string, string] =
			typeof code === 'string' ? [code, code] : code;
		super(codes[0]);
		this.codes = codes;
	}

	setSide(staveNote: StaveNote): this {
		const above = staveNote.getStemDirection() !== Stem.UP;
		this.setPosition(above ? Modifier.Position.ABOVE : Modifier.Position.BELOW);
		// setPosition resets the glyph off vexflow's own table, which mirrors the codes it
		// names. A raw SMuFL code has no mirror there, so swap in the other face by hand.
		const [aboveGlyph, belowGlyph] = this.codes;
		if (aboveGlyph !== belowGlyph) {
			this.setText(above ? aboveGlyph : belowGlyph);
		}
		return this;
	}
}
