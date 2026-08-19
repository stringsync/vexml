import { KeySignature, Stave } from 'vexflow';

/*
 * A key signature spelled out accidental by accidental, for a <key> written with
 * <key-step>/<key-alter> instead of <fifths> — microtonal and modal-jazz signatures, which
 * are not circle-of-fifths shaped and so have no key spec to name them.
 *
 * vexflow's own KeySignature always rebuilds its accidentals from a key spec (format() calls
 * Tables.keySignature), so there is no way to hand it a list; this overrides that one step
 * and reuses everything else — the glyph laying, the spacing and the stave-modifier plumbing
 * — so a custom signature places, measures and draws exactly like a normal one.
 */
export class CustomKeySignature extends KeySignature {
	constructor(
		private readonly accidentals: ReadonlyArray<{ type: string; line: number }>,
	) {
		// Any valid spec: format() below never reads it.
		super('C');
	}

	override format(): void {
		let stave = this.getStave();
		if (!stave) {
			stave = new Stave(0, 0, 100);
			this.setStave(stave);
		}
		this.width = 0;
		this.children = [];
		// Copied, not shared: convertToGlyph reads acc.line and the parent's cancel/alter paths
		// mutate the entries in place.
		this.accList = this.accidentals.map((a) => ({ ...a }));
		for (const [i, acc] of this.accList.entries()) {
			// nextAcc only widens the gap around a natural; the parent passes an
			// out-of-range read for the last one the same way.
			this.convertToGlyph(
				acc,
				this.accList[i + 1] as { type: string; line: number },
				stave,
			);
		}
		this.calculateDimensions();
		this.formatted = true;
	}
}
