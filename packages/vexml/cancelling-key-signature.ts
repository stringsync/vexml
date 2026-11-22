import type { KeySignature } from 'vexflow/core';
import { type KeyPitch, StaffKeySignature } from './staff-scaled-signatures';

const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/* The pitch on each clef's top line, counted in steps from C0 (octave * 7 + step). Every clef
 * vexml draws a key against is one of these; any other reads as treble, as vexflow does. */
const TOP_LINE_STEPS: Record<string, number> = {
	treble: 5 * 7 + 3,
	bass: 3 * 7 + 5,
	alto: 4 * 7 + 4,
	tenor: 4 * 7 + 2,
};

const ALTERS: Record<string, number> = { '#': 1, '##': 2, b: -1, bb: -2, n: 0 };

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

	// Its line, half a step a line below the top, names its step on the clef.
	protected override pitchOf(acc: { type: string; line: number }): KeyPitch {
		const top = TOP_LINE_STEPS[this.keyClef] ?? TOP_LINE_STEPS.treble ?? 0;
		const steps = top - Math.round(acc.line * 2);
		return {
			step: STEPS[((steps % 7) + 7) % 7] ?? 'C',
			alter: ALTERS[acc.type] ?? 0,
		};
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
