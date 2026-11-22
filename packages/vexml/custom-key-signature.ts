import { Stave } from 'vexflow/core';
import { type KeyPitch, StaffKeySignature } from './staff-scaled-signatures';

/* One accidental a custom key draws: its glyph type and line, and the pitch it marks. */
export interface CustomKeyAccidental extends KeyPitch {
	type: string;
	line: number;
}

/*
 * A key signature spelled out accidental by accidental, for a <key> written with
 * <key-step>/<key-alter> instead of <fifths>, microtonal and modal-jazz signatures, which
 * are not circle-of-fifths shaped and so have no key spec to name them.
 *
 * vexflow's own KeySignature always rebuilds its accidentals from a key spec (format() calls
 * Tables.keySignature), so there is no way to hand it a list; this overrides that one step
 * and reuses everything else (the glyph laying, the spacing and the stave-modifier plumbing),
 * so a custom signature places, measures and draws exactly like a normal one.
 */
export class CustomKeySignature extends StaffKeySignature {
	constructor(private readonly accidentals: readonly CustomKeyAccidental[]) {
		// Any valid spec: format() below never reads it.
		super('C');
	}

	protected override pitchOf(
		_acc: { type: string; line: number },
		index: number,
	): KeyPitch {
		const { step, alter } = this.accidentals[index] ?? { step: 'C', alter: 0 };
		return { step, alter };
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
