import type { KeySignature } from 'vexflow/core';
import { StaffKeySignature } from './staff-scaled-signatures';

/*
 * An ordinary key signature, scaled with the staff, with the naturals of the key it cancels before it (vexflow's own
 * order), after it (a <cancel location="right">), or alone (keySpec 'C', the naturals a
 * <cancel location="before-barline"> hangs at the previous measure's end).
 *
 * The clef comes in rather than off the stave: vexflow's KeySignature reads stave.getClef(),
 * which is 'treble' on any stave that draws no clef glyph, so a key change partway along a
 * bass or alto system would sit its accidentals at treble positions.
 */
export class CancellingKeySignature extends StaffKeySignature {
	constructor(
		keySpec: string,
		cancelKeySpec: string | undefined,
		private readonly keyClef: string,
		private readonly naturalsAfter: boolean,
	) {
		super(keySpec, cancelKeySpec);
	}

	// Every accidental is lined up against the clef passed in, whatever the stave says.
	protected override convertAccLines(
		_clef: string,
		type?: string,
		accList?: Array<{ type: string; line: number }>,
	): void {
		super.convertAccLines(this.keyClef, type, accList);
	}

	// The parent prepends the naturals; after the key, they are moved to the end. The entries
	// are the same objects either way, so the parent lines them up as before.
	protected override convertToCancelAccList(
		spec: string,
	): ReturnType<KeySignature['convertToCancelAccList']> {
		const cancelled = super.convertToCancelAccList(spec);
		if (cancelled && this.naturalsAfter) {
			this.accList = [
				...this.accList.slice(cancelled.accList.length),
				...cancelled.accList,
			];
		}
		return cancelled;
	}
}
