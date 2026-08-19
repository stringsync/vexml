import type { Clef, Key, Time } from '@stringsync/mdom';
import { StaveNote } from 'vexflow';
import { ACCIDENTAL_CODES } from './chord-translator';

// MusicXML <key-alter> semitones -> the vexflow accidental code, for a signature written
// without <fifths>. A <key-accidental> naming the glyph outright wins over this (see
// customKeyAccidentals); this is the fallback every exporter can be counted on to imply.
const KEY_ALTER_CODES: Record<string, string> = {
	'-2': 'bb',
	'-1': 'b',
	'0': 'n',
	'1': '#',
	'2': '##',
};

/** One mid-measure `<clef>` change, resolved to what vexflow draws and positions notes
 * against. See ScoreReader.midClefsOf. */
export type MidClefSpec = {
	beat: number;
	clef: string;
	annotation: string | undefined;
};

/*
 * Translates an mdom clef, key and time to the specs vexflow draws a stave's signature from.
 * StaveBuilder engraves these, while the layout and draw passes compare the specs across
 * measures to tell a signature that actually changed from one merely restated.
 */
export class SignatureTranslator {
	// VexFlow keys the tonic note for major but wants an 'm' suffix for minor
	// ('Am', 'G#m'); the bare minor tonic ('G#') is rejected as a bad key spec.
	vexflowKeySpec(key: Key): string {
		return key.mode === 'minor' ? `${key.rootNote}m` : `${key.rootNote}`;
	}

	/*
	 * MusicXML <time> -> vexflow time-signature spec: 'C' (common), 'C|' (cut), or
	 * "beats/beat-type". null when there's nothing drawable. Doubles as the equality
	 * key for detecting a mid-piece meter change.
	 */
	timeSignatureSpec(time: Time | null): string | null {
		if (time?.symbol === 'common') {
			return 'C';
		}
		if (time?.symbol === 'cut') {
			return 'C|';
		}
		// symbol="single-number" prints the beat count alone. vexflow reads a spec with no '/'
		// as a lone numerator and centers it vertically between the two signature lines.
		if (time?.symbol === 'single-number' && time.beats) {
			return time.beats;
		}
		if (time?.beats && time?.beatType) {
			return `${time.beats}/${time.beatType}`;
		}
		return null;
	}

	/*
	 * A <key>'s non-traditional accidentals — the <key-step>/<key-alter>(/<key-accidental>)
	 * triples MusicXML writes instead of <fifths> — as the glyph list a CustomKeySignature draws,
	 * in the order given rather than in circle-of-fifths order. Empty when the key is an ordinary
	 * <fifths> one (or carries nothing at all), which is the signal to use the plain key spec.
	 */
	customKeyAccidentals(
		key: Key,
		clef: string,
	): Array<{ type: string; line: number }> {
		const out: Array<{ type: string; line: number }> = [];
		for (const alteration of key.alterations) {
			const named = alteration.accidental;
			const type =
				(named ? ACCIDENTAL_CODES[named] : undefined) ??
				KEY_ALTER_CODES[String(alteration.alter)];
			if (!type) {
				continue;
			}
			out.push({
				type,
				line: this.keySignatureLine(alteration.step, alteration.octave, clef),
			});
		}
		return out;
	}

	/*
	 * MusicXML <clef> sign + line -> vexflow clef name. Covers the common signs;
	 * unknown combinations fall back to treble.
	 */
	vexflowClef(sign: string, line: number | null): string {
		switch (sign) {
			case 'F':
				return 'bass';
			case 'C':
				return line === 4 ? 'tenor' : 'alto';
			case 'percussion':
				return 'percussion';
			default:
				return 'treble';
		}
	}

	/*
	 * A clef's DRAWN identity: the vexflow clef name plus any octave annotation, or null
	 * when there is no clef. Two clefs that engrave to the same glyph share a signature
	 * (C/3 and C/5 are both 'alto'), so comparing signatures across measures spots a clef
	 * change that is actually visible instead of redrawing an identical glyph.
	 */
	vexflowClefSpec(clef: Clef | null): string | null {
		return clef
			? `${this.vexflowClef(clef.sign, clef.line)}|${this.vexflowClefAnnotation(clef.octaveChange) ?? ''}`
			: null;
	}

	/*
	 * ScoreReader.midClefsOf output resolved to what vexflow draws, so the layout and draw
	 * passes hand the tickable builder the same specs.
	 */
	midClefSpecs(
		changes: readonly { beat: number; clef: Clef }[],
	): MidClefSpec[] {
		return changes.map(({ beat, clef }) => ({
			beat,
			clef: this.vexflowClef(clef.sign, clef.line),
			annotation: this.vexflowClefAnnotation(clef.octaveChange),
		}));
	}

	/*
	 * MusicXML <clef-octave-change> -> vexflow clef annotation ('8va'/'8vb'), drawn as
	 * the small octave numeral above/below the clef glyph. vexflow only carries an octave
	 * annotation on G/F clefs, so ±2 (15ma/mb) and other clefs fall back to no annotation.
	 * ponytail: octave only; add 15ma/mb if a fixture ever needs it.
	 */
	vexflowClefAnnotation(octaveChange: number | null): string | undefined {
		if (octaveChange === 1) {
			return '8va';
		}
		if (octaveChange === -1) {
			return '8vb';
		}
		return undefined;
	}

	/*
	 * The staff line a key-signature accidental on `step` sits at, in the coordinates
	 * KeySignature draws in (0 = top line, +1 per line downward). `octave` pins it outright —
	 * MusicXML's <key-octave>. Without one, the accidental takes the highest position that still
	 * lands on the stave, which is where the traditional signatures put every flat and most
	 * sharps, so an unpinned custom signature reads like an ordinary one.
	 *
	 * The position comes from a throwaway StaveNote rather than a hand-rolled clef table: vexflow
	 * already resolves step/octave against every clef it knows. Its key props count lines
	 * bottom-up from below the stave, which is why the flip is `5 -` and not `4 -`: a note drawn
	 * at key-prop line L lands on Stave.getYForNote(L), and that is getYForLine(5 - L).
	 * ponytail: the flip assumes a 5-line stave. A non-traditional signature on a reduced stave
	 * would sit as if the missing lines were there; no fixture has one.
	 */
	private keySignatureLine(
		step: string,
		octave: number | null,
		clef: string,
	): number {
		const lineOf = (o: number) =>
			5 -
			(new StaveNote({
				keys: [`${step.toLowerCase()}/${o}`],
				duration: 'w',
				clef,
			}).getKeyProps()[0]?.line ?? 2);
		if (octave !== null) {
			return lineOf(octave);
		}
		const onStave = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
			.map(lineOf)
			.filter((line) => line >= 0 && line <= 4);
		// Highest on the stave = the smallest line number. Every step has one in every clef, so
		// the middle-line fallback is unreachable in practice.
		return onStave.length > 0 ? Math.min(...onStave) : 2;
	}
}
