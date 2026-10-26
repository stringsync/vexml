import type { Clef, Key, Time } from '@stringsync/mdom';
import {
	type Clef as ClefGlyph,
	StaveNote,
	VexFlow,
	Clef as VexflowClef,
} from 'vexflow/core';
import { Appearance, type GlyphType } from './appearance';
import { ACCIDENTAL_CODES } from './chord-translator';
import type {
	ExtendedTimeSpec,
	TimeFace,
	TimeSeparator,
} from './extended-time-signature';

/*
 * Translates an mdom clef, key and time to the specs vexflow draws a stave's signature from.
 * StaveBuilder engraves these, while the layout and draw passes compare the specs across
 * measures to tell a signature that actually changed from one merely restated.
 */
export class SignatureTranslator {
	private appearance = Appearance.NONE;

	/* Draw the clefs translated from here on in the document's glyphs (Appearance.NONE for
	 * vexflow's own). The layout sets it before it measures, so both passes draw alike. */
	useAppearance(appearance: Appearance): void {
		this.appearance = appearance;
	}

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
		const extended = this.extendedTimeSpec(time);
		if (extended) {
			return JSON.stringify(extended);
		}
		if (time?.beats && time?.beatType) {
			return `${time.beats}/${time.beatType}`;
		}
		return null;
	}

	/*
	 * The parts of a <time> vexflow's spec string cannot say: a note glyph as the denominator
	 * (symbol="note"/"dotted-note"), several beats/beat-type pairs and an <interchangeable> second meter. Null for a plain
	 * signature, which timeSignatureSpec hands to vexflow as before.
	 */
	extendedTimeSpec(time: Time | null): ExtendedTimeSpec | null {
		if (!time?.beats || !time.beatType) {
			return null;
		}
		const symbol = time.symbol;
		const noted = symbol === 'note' || symbol === 'dotted-note';
		const interchangeable = time.child('interchangeable');
		const other = interchangeable?.child('beats')?.text?.trim();
		const otherType = interchangeable?.child('beat-type')?.text?.trim();
		const hasOther = Boolean(other && otherType);
		// A composite meter writes several beats/beat-type pairs, printed side by side as 2/4 + 3/8.
		const pairs = time.components?.length
			? time.components
			: [{ beats: time.beats, beatType: time.beatType }];
		const separator = this.timeSeparator(time);
		if (!noted && !hasOther && pairs.length < 2 && !separator) {
			return null;
		}
		return {
			separator,
			faces: pairs.map((pair) =>
				this.timeFace(pair.beats, pair.beatType, noted ? symbol : null),
			),
			interchange:
				hasOther && other && otherType
					? {
							relation:
								interchangeable?.child('time-relation')?.text?.trim() ?? null,
							face: this.timeFace(
								other,
								otherType,
								interchangeable?.getAttribute('symbol') === 'note' ||
									interchangeable?.getAttribute('symbol') === 'dotted-note'
									? (interchangeable.getAttribute('symbol') as
											| 'note'
											| 'dotted-note')
									: null,
							),
						}
					: null,
		};
	}

	// <time separator>: null for "none", the default, which vexflow's stacked digits already are.
	private timeSeparator(time: Time): TimeSeparator | null {
		const separator = time.getAttribute('separator');
		return separator && SEPARATORS.has(separator)
			? (separator as TimeSeparator)
			: null;
	}

	/*
	 * The key a change from `prevKey` to `key` cancels with naturals, or null when it cancels
	 * none. A <cancel> names the cancelled key by its fifths and may move the naturals after the
	 * new key or before the barline. Without one, the key being replaced is cancelled, left of
	 * the new key: the spec says that always happens on a change to C major or A minor, and it
	 * is how vexml has drawn every other change too.
	 */
	keyCancel(key: Key | null, prevKey: Key | null): KeyCancel | null {
		const cancel = key?.child('cancel');
		const spec = FIFTHS_KEYS[Number(cancel?.text?.trim()) + 7];
		if (cancel && spec) {
			const location = cancel.getAttribute('location');
			return {
				spec,
				location:
					location === 'right' || location === 'before-barline'
						? location
						: 'left',
			};
		}
		return prevKey?.rootNote
			? { spec: this.vexflowKeySpec(prevKey), location: 'left' }
			: null;
	}

	// A dotted-note denominator is the beat of a compound meter: 6/8 reads as 2 over a dotted
	// quarter. A meter whose beats do not group in threes has no such beat, so it falls back
	// to the plain note.
	private timeFace(
		beats: string,
		beatType: string,
		note: string | null,
	): TimeFace {
		if (note !== 'dotted-note') {
			return {
				beats,
				beatType,
				note: note === 'note' ? 'note' : null,
			};
		}
		const count = Number(beats);
		const unit = Number(beatType) / 2;
		if (Number.isInteger(count) && count % 3 === 0 && unit >= 1) {
			return {
				beats: String(count / 3),
				beatType: String(unit),
				note: 'dotted-note',
			};
		}
		return { beats, beatType, note: 'note' };
	}

	/*
	 * A <key>'s non-traditional accidentals: the <key-step>/<key-alter>(/<key-accidental>)
	 * triples MusicXML writes instead of <fifths>, as the glyph list a CustomKeySignature draws,
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
	 * The vexflow clef a <clef> draws as. An additional clef (a cue clef, or a second clef
	 * sharing the staff) ignores its <line>, per the spec, and takes its sign's usual one.
	 */
	clefName(clef: Clef): string {
		return this.vexflowClef(
			clef.sign,
			clef.getAttribute('additional') === 'yes' ? null : clef.line,
		);
	}

	/*
	 * How big a clef draws. `change` is the size a clef with no size attribute takes: small for a
	 * change after the system opening, full for the opening itself. size="cue" and "grace-cue"
	 * draw small, "full" at full size even mid-system, and "large" a fifth larger than full.
	 */
	clefSize(clef: Clef | null, change: boolean): ClefSize {
		switch (clef?.getAttribute('size')) {
			case 'cue':
			case 'grace-cue':
				return { size: 'small', scale: 1 };
			case 'full':
				return { size: 'default', scale: 1 };
			case 'large':
				return { size: 'default', scale: 1.2 };
			default:
				return { size: change ? 'small' : 'default', scale: 1 };
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
			? `${this.clefName(clef)}|${this.vexflowClefAnnotation(clef.octaveChange) ?? ''}`
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
			clef: this.clefName(clef),
			annotation: this.vexflowClefAnnotation(clef.octaveChange),
			size: this.clefSize(clef, true),
			glyph: this.clefGlyph(
				this.clefName(clef),
				this.vexflowClefAnnotation(clef.octaveChange),
			),
		}));
	}

	/*
	 * The glyph the document's `<appearance>` draws a vexflow clef with in place of vexflow's
	 * own, or null to keep vexflow's. Keyed by the glyph vexflow would draw, so every C clef
	 * line takes the c-clef glyph, and an F clef with an octave numeral keeps its own.
	 */
	clefGlyph(name: string, annotation: string | undefined): string | null {
		const code = VexflowClef.types[name]?.code;
		const { Glyphs } = VexFlow;
		let type: GlyphType | null = null;
		if (code === Glyphs.cClef) {
			type = 'c-clef';
		} else if (code === Glyphs.fClef && !annotation) {
			type = 'f-clef';
		} else if (code === Glyphs.gClef && annotation === '8vb') {
			type = 'g-clef-ottava-bassa';
		} else if (code === Glyphs.unpitchedPercussionClef1) {
			type = 'percussion-clef';
		}
		return type ? this.appearance.glyph(type) : null;
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
	 * KeySignature draws in (0 = top line, +1 per line downward). `octave` pins it outright:
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

// A <cancel>'s fifths -> the major key it names, for vexflow's key spec.
const FIFTHS_KEYS = [
	'Cb',
	'Gb',
	'Db',
	'Ab',
	'Eb',
	'Bb',
	'F',
	'C',
	'G',
	'D',
	'A',
	'E',
	'B',
	'F#',
	'C#',
];

const SEPARATORS: ReadonlySet<string> = new Set([
	'horizontal',
	'diagonal',
	'vertical',
	'adjacent',
]);

/** The key a key change cancels, as a vexflow key spec, and where its naturals print. */
export type KeyCancel = {
	spec: string;
	location: 'left' | 'right' | 'before-barline';
};

/** How a clef glyph is sized: vexflow's size name, then a scale on top of it. */
export type ClefSize = {
	size: 'default' | 'small';
	scale: number;
};

/* Draws a vexflow clef with `glyph` (see SignatureTranslator.clefGlyph); null keeps its own. */
export function setClefGlyph(clef: ClefGlyph, glyph: string | null): void {
	if (glyph !== null) {
		clef.code = glyph;
		clef.setText(glyph);
	}
}

/* Scales a vexflow clef glyph past the two sizes vexflow knows (size="large", staff-size). */
export function scaleClefGlyph(glyph: ClefGlyph, scale: number): void {
	if (scale !== 1) {
		glyph.setFontSize(Number.parseFloat(String(glyph.fontInfo.size)) * scale);
	}
}

/** One mid-measure `<clef>` change, resolved to what vexflow draws and positions notes
 * against. See ScoreReader.midClefsOf. */
export type MidClefSpec = {
	beat: number;
	clef: string;
	annotation: string | undefined;
	size: ClefSize;
	/** The document's glyph for it, or null for vexflow's own (see clefGlyph). */
	glyph: string | null;
};
