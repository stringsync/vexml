import {
	Chord,
	type Clef,
	Dashes,
	type Direction,
	type Harmony,
	type Key,
	MElement,
	type Measure,
	type Metronome,
	type MetronomeNote,
	type Note,
	type Part,
	type PartGroupSpan,
	type Score,
	type Time,
} from '@stringsync/mdom';
import { Appearance } from './appearance';
import type { ChordFrame } from './chord-diagram-glyph';
import { DEFAULT_TEMPO_BPM, EPSILON } from './constants';
import {
	ANY_STAFF,
	DocumentLayout,
	type LayoutBlock,
	type PageMargins,
} from './document-layout';
import type { DynamicGlyphs } from './dynamic-glyphs';
import { fontScaleOf } from './font-scale';
import type { ModulationNote, TempoModulation } from './metronome-glyph';
import {
	BEATER_GLYPHS,
	PERCUSSION_GLYPHS,
	STICK_GLYPHS,
	TIMPANI_GLYPH,
	TIP_INDEX,
} from './percussion-glyphs';
import type { Jump } from './sequence';
import { smuflGlyph } from './smufl';
import { ENCLOSURE_SHAPES, type EnclosureShape } from './text-enclosure';

export class ScoreReader {
	private readonly measureBeats = new Map<Note, number | null>();
	private readonly lengths = new Map<Note, number | null>();
	// Read per measure and staff by the layout and every draw pass alike.
	private readonly midClefCache = new WeakMap<
		Measure,
		Map<string, { beat: number; clef: Clef }[]>
	>();
	private readonly staffVoiceCache = new WeakMap<
		Measure,
		Map<string, StaffVoice[]>
	>();
	private readonly voiceCache = new WeakMap<Measure, MeasureVoice[]>();
	private readonly divisionsByMeasure = new WeakMap<Measure, number>();
	// One staff's <measure-style> regions, walked once per part and staff (see staffStylesOf).
	private readonly staffStyleCache = new WeakMap<
		Part,
		Map<string, StaffStyle[]>
	>();
	private readonly wordFonts = new WeakMap<Score, MElement | null>();

	// Only to answer whether a dynamic marking can be drawn as music (see dynamicsOf). The
	// spelling itself belongs to the draw pass, not to a read.
	constructor(private readonly dynamics: DynamicGlyphs) {}

	/*
	 * Note.measureBeat and Note.beats, read once per note. mdom finds a note's <divisions> by
	 * gathering the <attributes> of every earlier measure in the part, so each read costs the
	 * part's length. Layout, both draw passes and playback all ask about every note. A
	 * ScoreReader lives for one render, over a document that doesn't change under it.
	 */
	measureBeatOf(note: Note): number | null {
		if (!this.measureBeats.has(note)) {
			this.measureBeats.set(note, note.measureBeat);
		}
		return this.measureBeats.get(note) ?? null;
	}

	beatsOf(note: Note): number | null {
		if (!this.lengths.has(note)) {
			this.lengths.set(note, note.beats);
		}
		return this.lengths.get(note) ?? null;
	}

	/*
	 * One staff's renderable content from a measure's voices; see {@link StaffVoice}.
	 *
	 * A voice is PROJECTED onto the staff rather than assigned to one: each chord keeps only
	 * the notes whose own `<staff>` names this staff. That is what makes cross-staff writing
	 * work: a piano voice that runs up out of the bass staff mid-beam has its upper notes
	 * drawn on the treble staff, where the composer put them, instead of climbing out of the
	 * bass staff on five ledger lines. A chord split across both staves lands as two partial
	 * chords, one per staff, sharing an onset.
	 *
	 * A voice with nothing on this staff drops out entirely (an empty voice would crash the
	 * formatter), and one that never leaves its own staff projects to itself unchanged: the
	 * single-staff case is untouched.
	 *
	 * The layout (measuring) and draw passes must select identically, so the projection lives
	 * here, read once per measure and staff: mdom rebuilds a measure's voices and chords on
	 * every read, and the layout, the stem planner and each draw pass all ask.
	 */
	staffVoices(measure: Measure, staffNumber: string): StaffVoice[] {
		let byStaff = this.staffVoiceCache.get(measure);
		if (!byStaff) {
			byStaff = new Map();
			this.staffVoiceCache.set(measure, byStaff);
		}
		let staffVoices = byStaff.get(staffNumber);
		if (!staffVoices) {
			staffVoices = this.projectVoices(this.voicesOf(measure), staffNumber);
			byStaff.set(staffNumber, staffVoices);
		}
		return staffVoices;
	}

	/*
	 * A measure's voices and their chords, read once: mdom rebuilds both on every read, and a
	 * measure is asked once per staff and again for its onsets.
	 */
	voicesOf(measure: Measure): MeasureVoice[] {
		let voices = this.voiceCache.get(measure);
		if (!voices) {
			voices = measure.voices.map((voice) => ({
				staff: voice.staff,
				chords: voice.chords,
			}));
			this.voiceCache.set(measure, voices);
		}
		return voices;
	}

	private projectVoices(
		voices: MeasureVoice[],
		staffNumber: string,
	): StaffVoice[] {
		const out: StaffVoice[] = [];
		for (const voice of voices) {
			const chords: Chord[] = [];
			for (const chord of voice.chords) {
				const notes = chord.notes.filter((note) => note.staff === staffNumber);
				// Keep the original Chord identity when the whole chord stays: it's the key
				// the hit index maps noteheads back through.
				if (notes.length === chord.notes.length) {
					chords.push(chord);
				} else if (notes.length > 0) {
					chords.push(new Chord(notes));
				}
			}
			if (chords.length > 0) {
				out.push({
					chords,
					// mdom sets a voice's staff from its FIRST note, so exactly one staff owns
					// each voice's beams: the run is grouped once and spans whatever staves its
					// notes landed on.
					beamChords: voice.staff === staffNumber ? voice.chords : null,
					run: voice.chords,
				});
			}
		}
		return out;
	}

	/*
	 * What a `<key>` prints, as an equality key: the string to compare against the previous
	 * measure's to spot a mid-piece key change, and the test for "does this staff draw a
	 * signature at all" (null when it draws nothing).
	 *
	 * A traditional key is identified by its tonic. A non-traditional one (<key-step>/
	 * <key-alter> instead of <fifths>) has no tonic, so it's identified by the alterations it
	 * lists, read positionally the way the drawing side reads them.
	 */
	keyIdentity(key: Key | null): string | null {
		if (key?.rootNote) {
			return key.rootNote;
		}
		const alterations = key?.alterations ?? [];
		if (alterations.length === 0) {
			return null;
		}
		return alterations.map((a) => `${a.step}${a.alter}`).join(' ');
	}

	/*
	 * The beat length a measure's width is floored at (see meterBeats), except for a
	 * <measure implicit="yes"> (a pickup bar, or the back half of a measure split across a
	 * system break), which floors at 0 so it is sized to the music it actually holds. An
	 * implicit measure is short BY DECLARATION, not underfull by accident, so padding it out
	 * to the meter would draw a pickup as wide as a full bar.
	 */
	meterFloor(measure: Measure, staffNumber?: string): number {
		return measure.isImplicit
			? 0
			: this.meterBeats(measure.getTime(staffNumber));
	}

	/*
	 * A meter's length in quarter-note beats (4/4 -> 4, 6/8 -> 3, 2/2 -> 4). 0 when
	 * unmetered or absent, so callers fall back to the content's own end. Flooring a
	 * measure's endBeat at this pads an underfull measure (e.g. a final fragment) with
	 * trailing ghosts, reserving the missing time as blank space instead of letting the
	 * formatter justify the last note flush against the end barline.
	 */
	meterBeats(time: Time | null): number {
		if (!time || time.isSenzaMisura) {
			return 0;
		}
		let total = 0;
		// A composite meter lists several beats/beat-type pairs (2/4 + 3/8); an additive one
		// writes a summed numerator in a single pair ("3+2" over 8). Both add up to the bar.
		for (const component of time.components) {
			const beatType = Number(component.beatType);
			if (!beatType) {
				return 0;
			}
			for (const term of component.beats.split('+')) {
				const beats = Number(term);
				if (!beats) {
					return 0;
				}
				total += (beats / beatType) * 4;
			}
		}
		return total;
	}

	/*
	 * A measure's <barline location="middle"> dividers: the beat each one falls on and its
	 * <bar-style>. These are the barlines that land off the measure edge, such as a double bar or a
	 * dotted divider mid-bar, which MusicXML writes between two notes rather than at an
	 * edge. Left/right barlines are the measure's own edges and are read elsewhere.
	 */
	midBarlinesOf(measure: Measure): { beat: number; style: string }[] {
		return measure.barlines
			.filter((barline) => barline.location === 'middle')
			.map((barline) => ({
				beat: barline.measureBeat ?? 0,
				style: barline.barStyle ?? 'regular',
			}));
	}

	/*
	 * The fermatas a measure's edge `<barline>`s carry: a hold over the bar line itself,
	 * usually a final one. mdom's Barline has no getter for them, so each `<fermata>` child
	 * is read off the element: its text is the shape (empty means normal) and type="inverted"
	 * puts it below. A barline may carry two, one upright and one inverted.
	 * ponytail: a middle barline's fermata is dropped; it would need the BarNote's x, and no
	 * fixture asks for one.
	 */
	barlineFermatasOf(measure: Measure): BarlineFermata[] {
		return measure.barlines
			.filter((barline) => barline.location !== 'middle')
			.flatMap((barline) =>
				barline.childrenNamed('fermata').map((fermata) => ({
					location: barline.location === 'left' ? 'left' : 'right',
					shape: fermata.text?.trim() || 'normal',
					inverted: fermata.getAttribute('type') === 'inverted',
				})),
			);
	}

	/*
	 * A measure's mid-measure <clef> changes for one staff: Measure.clefChanges, minus any
	 * landing at beat 0.
	 * ponytail: a change landing at beat 0 is dropped rather than drawn inline; it is the
	 * staff's OPENING clef. Measure.getClef doesn't look past the measure's first note, so
	 * such a staff still opens in the previous clef and switches at the next barline
	 * (navigation.musicxml's bass staff documents exactly that). Closing that gap means
	 * teaching the STAVE clef to see past the first note, not drawing a second glyph here.
	 */
	midClefsOf(
		measure: Measure,
		staffNumber: string,
	): { beat: number; clef: Clef }[] {
		let byStaff = this.midClefCache.get(measure);
		if (!byStaff) {
			byStaff = new Map();
			this.midClefCache.set(measure, byStaff);
		}
		let changes = byStaff.get(staffNumber);
		if (!changes) {
			changes = measure
				.clefChanges(staffNumber)
				// after-barline="yes" holds the clef back from the end of the measure to the
				// next one's opening, past the barline.
				.filter(
					(change) =>
						change.beat > EPSILON &&
						change.clef.getAttribute('after-barline') !== 'yes',
				);
			byStaff.set(staffNumber, changes);
		}
		return changes;
	}

	/*
	 * The score's <measure-style><multiple-rest> runs: each lead measure's index mapped to how
	 * many measures it consolidates, plus the indexes those runs swallow. A multirest is drawn
	 * as ONE wide measure holding the thick horizontal bar, so the swallowed measures are given
	 * no box by the layout planner and the draw pass skips them (the document keeps them, so
	 * playback still counts the full rest).
	 *
	 * A run only collapses when EVERY part (and every staff within it; see multiRestCountOf)
	 * declares the same count at the same measure. Parts are laid out in one grid of measure
	 * columns, so collapsing three bars of a resting flute against three played bars of a violin
	 * would shear the two apart.
	 */
	multiRestsOf(parts: Part[]): {
		leads: Map<number, number>;
		hidden: Set<number>;
		symbols: Set<number>;
	} {
		const leads = new Map<number, number>();
		const hidden = new Set<number>();
		const symbols = new Set<number>();
		const measureCount = Math.max(
			0,
			...parts.map((part) => part.measures.length),
		);
		for (let m = 0; m < measureCount; m++) {
			if (hidden.has(m)) {
				continue;
			}
			const count = this.multiRestCountOf(parts[0]?.measures[m]);
			if (
				!count ||
				count < 2 ||
				!parts.every(
					(part) => this.multiRestCountOf(part.measures[m]) === count,
				)
			) {
				continue;
			}
			leads.set(m, count);
			if (this.multiRestUsesSymbols(parts[0]?.measures[m])) {
				symbols.add(m);
			}
			for (let swallowed = m + 1; swallowed < m + count; swallowed++) {
				hidden.add(swallowed);
			}
		}
		return { leads, hidden, symbols };
	}

	/*
	 * Whether a measure's <multiple-rest> asks for old-style rest symbols (use-symbols="yes")
	 * instead of the thick bar. mdom keeps only the count, so the attribute is read off the raw
	 * element. The first staff speaks for the column, as multiRestCountOf does.
	 */
	private multiRestUsesSymbols(measure: Measure | undefined): boolean {
		for (const node of measure?.children ?? []) {
			if (!(node instanceof MElement) || node.tag !== 'attributes') {
				continue;
			}
			for (const style of node.childrenNamed('measure-style')) {
				const number = style.getAttribute('number');
				if (number !== null && number !== '1') {
					continue;
				}
				const rest = style.child('multiple-rest');
				if (rest?.getAttribute('use-symbols') === 'yes') {
					return true;
				}
			}
		}
		return false;
	}

	/*
	 * What one staff's <measure-style> draws in place of a measure's written-out notes, or
	 * null when the notes draw. MusicXML has the repeated music written out in full either
	 * way (so playback plays it as written); the style only says it is shown as a sign.
	 *
	 * A <measure-repeat> covers whole measures, from the measure its start sits in up to the
	 * one its stop sits in. A <beat-repeat>, or a <slash> without stems, replaces the notes
	 * as a whole only when its span covers the whole measure and excepts no voice; any other
	 * span hides its notes one by one (see noteStyleOf).
	 */
	measureStyleOf(
		measure: Measure,
		staffNumber: string,
	): MeasureStyleMark | null {
		const style = this.staffStylesOf(measure.part, staffNumber)[measure.index];
		if (!style) {
			return null;
		}
		if (style.repeat) {
			return { kind: 'measure-repeat', ...style.repeat };
		}
		const covers = (span: Span & { except: string[] }) =>
			span.from <= EPSILON &&
			span.to >= style.length - EPSILON &&
			span.except.length === 0;
		const beatRepeat = style.beatRepeats.find(covers);
		if (beatRepeat) {
			return {
				kind: 'beat-repeat',
				slashes: beatRepeat.slashes,
				dots: beatRepeat.dots,
				beats: beatsAcross(style.length, beatRepeat.unit),
				length: style.length,
			};
		}
		const slash = style.slashes.find((span) => !span.stems && covers(span));
		if (slash) {
			return {
				kind: 'beat-slash',
				unit: slash.unit,
				dots: slash.dots,
				beats: beatsAcross(style.length, slash.unit),
				length: style.length,
			};
		}
		return null;
	}

	/*
	 * What a beat-level span does to one note of a measure it only partly covers (or that
	 * excepts a voice): hides it, and, on the first hidden note of each of its beats, draws
	 * the sign standing for that beat. The notes stay in the voice, so their beams, ties and
	 * the other voices keep their places. One voice carries the signs, so voices sharing a
	 * span do not stack theirs; a voice named by <except-voice> is left alone.
	 */
	noteStyleOf(note: Note): NoteStyle {
		const measure = note.measure;
		const style = this.staffStylesOf(measure.part, note.staff)[measure.index];
		const onset = this.measureBeatOf(note);
		if (!style || onset === null || note.isGrace) {
			return NOT_STYLED;
		}
		const spanAt = (n: Note, at: number) =>
			[
				...style.beatRepeats.map((span) => ({
					...span,
					kind: 'beat-repeat' as const,
				})),
				...style.slashes
					.filter((span) => !span.stems)
					.map((span) => ({ ...span, kind: 'beat-slash' as const })),
			].find(
				(span) =>
					!span.except.includes(n.voice) &&
					at >= span.from - EPSILON &&
					at < span.to - EPSILON,
			);
		const span = spanAt(note, onset);
		if (!span) {
			return NOT_STYLED;
		}
		const covered = measure.notes
			.filter((n) => n.staff === note.staff && !n.isGrace)
			.flatMap((n) => {
				const at = this.measureBeatOf(n);
				return at !== null && spanAt(n, at)?.from === span.from
					? [{ n, at }]
					: [];
			});
		const owner = covered[0]?.n.voice;
		const windowOf = (at: number) =>
			Math.floor((at - span.from + EPSILON) / span.unit);
		const first = covered.find(
			({ n, at }) => n.voice === owner && windowOf(at) === windowOf(onset),
		);
		const anchored =
			note.voice === owner && first !== undefined && first.at === onset;
		const { dots } = span;
		let sign: StyleSign | null = null;
		if (anchored) {
			sign =
				span.kind === 'beat-repeat'
					? { kind: 'beat-repeat', slashes: span.slashes, dots }
					: { kind: 'beat-slash', unit: span.unit, dots };
		}
		return { hidden: true, sign };
	}

	/*
	 * Whether a note sits under a <slash use-stems="yes">: rhythmic notation, its rhythm and
	 * stem kept but its pitch shown as a slash notehead on the middle line.
	 */
	/*
	 * A note's tab <bend>, or null when it has none. mdom's Note.bend reads only <bend-alter>
	 * and <release>; the rest (<pre-bend>, <with-bar>, the shape attribute) comes off the
	 * element itself. <pre-bend> and <release> are a schema choice, so at most one is set.
	 * A bend and release may also be two <bend> elements, the second carrying <release/>.
	 */
	bendOf(note: Note): TabBendMark | null {
		const bend = note.bend;
		const elements = note.technicals.filter((t) => t.technicalType === 'bend');
		const element = elements[0];
		if (!bend || !element) {
			return null;
		}
		const released =
			bend.release ||
			elements.slice(1).some((e) => e.child('release') !== null);
		const bar = element.child('with-bar');
		return {
			semitones: bend.semitones,
			release: released,
			preBend: element.child('pre-bend') !== null,
			shape: element.getAttribute('shape') === 'angled' ? 'angled' : 'curved',
			bar: bar ? (bar.text ?? '').trim() : null,
		};
	}

	isRhythmSlashed(note: Note): boolean {
		const measure = note.measure;
		const style = this.staffStylesOf(measure.part, note.staff)[measure.index];
		const onset = this.measureBeatOf(note) ?? 0;
		return (
			style?.slashes.some(
				(span) =>
					span.stems &&
					onset >= span.from - EPSILON &&
					onset < span.to - EPSILON,
			) ?? false
		);
	}

	/*
	 * Walk one staff's measures in order, carrying each <measure-style> region from its start
	 * to its stop. A <measure-repeat> starts and stops at measure granularity; a <beat-repeat>
	 * or <slash> at the beat its <attributes> block falls on, so its span in each measure is
	 * kept in beats. A region left open runs to the end of the part, as the spec allows.
	 */
	private staffStylesOf(part: Part, staffNumber: string): StaffStyle[] {
		let byStaff = this.staffStyleCache.get(part);
		if (!byStaff) {
			byStaff = new Map();
			this.staffStyleCache.set(part, byStaff);
		}
		const cached = byStaff.get(staffNumber);
		if (cached) {
			return cached;
		}
		const styles: StaffStyle[] = [];
		let repeat: { count: number; slashes: number; start: number } | null = null;
		let beatRepeat: (BeatRepeatStyle & { from: number }) | null = null;
		let slash: (SlashStyle & { from: number }) | null = null;
		for (const measure of part.measures) {
			const m = styles.length;
			const length = this.meterFloor(measure, staffNumber) || measure.endBeat;
			const unitOf = (style: MElement) =>
				slashUnit(style) ?? beatUnit(measure.getTime(staffNumber));
			const style: StaffStyle = {
				repeat: null,
				beatRepeats: [],
				slashes: [],
				length,
			};
			for (const { beat, element } of measureStyleEvents(
				measure,
				staffNumber,
			)) {
				const starts = element.getAttribute('type') === 'start';
				const slashes = Number(element.getAttribute('slashes') ?? 1) || 1;
				const dots = element.getAttribute('use-dots') === 'yes';
				const except = element
					.childrenNamed('except-voice')
					.flatMap((voice) => (voice.text ? [voice.text] : []));
				if (element.tag === 'measure-repeat') {
					repeat = starts
						? { count: Number(element.text) || 1, slashes, start: m }
						: null;
				} else if (element.tag === 'beat-repeat') {
					if (beatRepeat) {
						style.beatRepeats.push({ ...beatRepeat, to: beat });
					}
					beatRepeat = starts
						? { slashes, dots, except, unit: unitOf(element), from: beat }
						: null;
				} else if (element.tag === 'slash') {
					if (slash) {
						style.slashes.push({ ...slash, to: beat });
					}
					slash = starts
						? {
								stems: element.getAttribute('use-stems') === 'yes',
								dots,
								except,
								unit: unitOf(element),
								from: beat,
							}
						: null;
				}
			}
			if (repeat) {
				style.repeat = {
					count: repeat.count,
					slashes: repeat.slashes,
					bar: (m - repeat.start) % repeat.count,
				};
			}
			// Still open at the barline: the span runs to the end of this measure and on from
			// the start of the next.
			if (beatRepeat) {
				style.beatRepeats.push({ ...beatRepeat, to: length });
				beatRepeat = { ...beatRepeat, from: 0 };
			}
			if (slash) {
				style.slashes.push({ ...slash, to: length });
				slash = { ...slash, from: 0 };
			}
			styles.push(style);
		}
		byStaff.set(staffNumber, styles);
		return styles;
	}

	/*
	 * The <clef> in effect at the END of a measure for one staff: its last mid-measure change
	 * if it has one, else the clef it opened with. This is what the NEXT measure compares
	 * against to decide whether to reprint a clef: a change already stated inside a measure
	 * (or as its courtesy clef) must not be stated again at the next barline.
	 */
	clefAtEndOf(measure: Measure | undefined, staffNumber: string): Clef | null {
		if (!measure) {
			return null;
		}
		// Not Measure.clefAtEnd: that counts a change landing at beat 0, which midClefsOf
		// deliberately drops. Counting it here would tell the next measure the clef is already
		// in effect, so nothing would ever print it and the staff would silently stay in the
		// old clef (navigation.musicxml's bass staff). The two have to agree.
		return (
			this.midClefsOf(measure, staffNumber).at(-1)?.clef ??
			measure.getClef(staffNumber)
		);
	}

	/**
	 * The `<print><measure-numbering>` that leads `measure`, or null when its <print> sets none.
	 * It holds from here on in its part until the next one, which the caller carries forward.
	 * `system` (which part of the system shows the number) and `staff` (which of the part's
	 * staves the number rides) are null when absent.
	 */
	measureNumberingOf(measure: Measure): MeasureNumberingMark | null {
		const element = measure.print?.child('measure-numbering');
		if (!element) {
			return null;
		}
		const text = element.text?.trim();
		const value =
			text === 'none' || text === 'measure' || text === 'system'
				? text
				: 'system';
		const system = element.getAttribute('system');
		return {
			value,
			system: SYSTEM_RELATIONS.find((relation) => relation === system) ?? null,
			staff: element.getAttribute('staff'),
		};
	}

	/*
	 * A measure's metronome mark from the first <direction> that carries a
	 * <metronome>, or null when none does. MusicXML's <beat-unit> names ('quarter',
	 * 'eighth', 'half', ...) already match StaveTempo's duration codes. bpm comes from
	 * <per-minute>, falling back to the <sound tempo>, then to 120, so a metronome
	 * directive without a number still prints "= 120".
	 *
	 * A SECOND <beat-unit> is the metric-modulation form ("dotted quarter = dotted half"),
	 * which states a relation rather than a rate and so carries no <per-minute>; bpm keeps
	 * its fallback for the playback path, which has no way to read a relation.
	 *
	 * A <metronome> written in the <metronome-note> form carries no <beat-unit> at all and is
	 * skipped here: that shape is a note-group relation, read separately by
	 * {@link modulationOf} and drawn beside this mark.
	 */
	tempoOf(measure: Measure): TempoMark | null {
		for (const direction of measure.directions) {
			for (const metronome of direction.metronomes) {
				const [first, second] = metronome.beatUnits;
				if (!first) {
					continue;
				}
				return {
					duration: first.type,
					dots: first.dots,
					bpm:
						Number(metronome.perMinute ?? direction.soundTempo) ||
						DEFAULT_TEMPO_BPM,
					duration2: second?.type ?? null,
					dots2: second?.dots ?? 0,
					parenthesis: metronome.parentheses,
					justify: this.justifyOf(metronome),
					position: this.positionOf(metronome),
				};
			}
		}
		return null;
	}

	/*
	 * A measure's metric modulation: the first <metronome> written in the <metronome-note>
	 * form, or null when none is. This is the note-GROUP shape ("two beamed eighths = a
	 * quarter-eighth triplet", i.e. a swing marking), which states a relation between two
	 * rhythms rather than a rate, and which the <beat-unit> form {@link tempoOf} reads cannot
	 * express.
	 *
	 * The two live side by side: an exporter routinely writes the rate in one <direction-type>
	 * and this in the next, of the same <direction>, so a measure can have both and both print.
	 *
	 * It is notation only. Nothing here reaches playback: a <sound><swing> is what makes the
	 * timing swing (see {@link swingOf}), and a score can carry this mark without one.
	 */
	modulationOf(measure: Measure): TempoModulation | null {
		for (const direction of measure.directions) {
			for (const metronome of direction.metronomes) {
				// <metronome-relation> splits the notes into the two sides of the equation. With
				// no relation there is nothing to equate, so the mark states nothing and is skipped.
				const relation = metronome.relation;
				if (!relation) {
					continue;
				}
				const left = this.modulationNotesOf(relation.left);
				const right = this.modulationNotesOf(relation.right);
				if (left.length === 0 || right.length === 0) {
					continue;
				}
				return {
					left,
					right,
					rate: null,
					parenthesis: metronome.parentheses,
					arrows: metronome.child('metronome-arrows') !== null,
					justify: this.justifyOf(metronome),
					position: this.positionOf(metronome),
				};
			}
		}
		return null;
	}

	/*
	 * The <beat-unit> form as note glyphs, for a mark StaveTempo cannot draw: one whose units
	 * carry <beat-unit-tied>. Null for every other mark, which {@link tempoOf} hands to
	 * StaveTempo. A tied unit is the unit followed by the units tied
	 * to it, in a row, each tying to the next; the right side is the second unit, or the bpm.
	 */
	rateModulationOf(measure: Measure): TempoModulation | null {
		for (const direction of measure.directions) {
			for (const metronome of direction.metronomes) {
				const units = this.tiedUnitsOf(metronome);
				const [first, second] = units;
				if (!first || !units.some((unit) => unit.length > 1)) {
					continue;
				}
				const bpm =
					Number(metronome.perMinute ?? direction.soundTempo) ||
					DEFAULT_TEMPO_BPM;
				return {
					left: this.unitNotesOf(first),
					right: second ? this.unitNotesOf(second) : [],
					rate: second ? null : String(bpm),
					parenthesis: metronome.parentheses,
					arrows: false,
					justify: this.justifyOf(metronome),
					position: this.positionOf(metronome),
				};
			}
		}
		return null;
	}

	/*
	 * A <metronome>'s <beat-unit>s with the <beat-unit-tied>s that follow each, flattened to
	 * one run of notes per unit. mdom types only the units themselves, so this walks the raw
	 * children: the dots after a unit belong to it, and a tied unit carries its own.
	 */
	private tiedUnitsOf(
		metronome: Metronome,
	): Array<Array<{ type: string; dots: number }>> {
		const units: Array<Array<{ type: string; dots: number }>> = [];
		for (const node of metronome.children) {
			if (!(node instanceof MElement)) {
				continue;
			}
			if (node.tag === 'beat-unit') {
				units.push([{ type: node.text?.trim() ?? 'quarter', dots: 0 }]);
			} else if (node.tag === 'beat-unit-dot') {
				const note = units.at(-1)?.at(-1);
				if (note) {
					note.dots++;
				}
			} else if (node.tag === 'beat-unit-tied') {
				units.at(-1)?.push({
					type: node.child('beat-unit')?.text?.trim() ?? 'quarter',
					dots: node.childrenNamed('beat-unit-dot').length,
				});
			}
		}
		return units;
	}

	private unitNotesOf(
		unit: Array<{ type: string; dots: number }>,
	): ModulationNote[] {
		return unit.map((note, i) => ({
			type: note.type,
			dots: note.dots,
			beamed: false,
			beamsToNext: 0,
			tiesToNext: i < unit.length - 1,
			tuplet: null,
		}));
	}

	/* A <metronome>'s `justify`, which part of the mark sits on its anchor. */
	private justifyOf(metronome: Metronome): 'left' | 'center' | 'right' | null {
		const justify = metronome.getAttribute('justify');
		return justify === 'left' || justify === 'center' || justify === 'right'
			? justify
			: null;
	}

	/*
	 * A measure's PLAYBACK tempo, in quarter notes per minute (as a TempoMark). The
	 * visible <metronome> mark wins (via {@link tempoOf}); otherwise a <sound tempo>
	 * drives timing, whether co-located in a <direction> or standalone as a direct measure
	 * child (MusicXML's tempo is already quarter-note BPM). null means no mark here,
	 * so the previous tempo carries forward.
	 *
	 * <sound tempo> is playback-only: it engraves no metronome mark, so the visual
	 * path (draw-pass / layout-planner) stays on {@link tempoOf} and never sees it.
	 */
	playbackTempoOf(measure: Measure): TempoMark | null {
		const metronome = this.tempoOf(measure);
		if (metronome) {
			return metronome;
		}
		for (const sound of measure.sounds) {
			if (sound.tempo) {
				return { duration: 'quarter', bpm: sound.tempo };
			}
		}
		return null;
	}

	/*
	 * A measure's <sound><swing> performance instruction, or null when it carries none, in
	 * which case the swing already in force carries forward, like tempo. This is the ONLY
	 * thing that makes playback swing; a <metronome> "two eighths = triplet quarter-eighth"
	 * mark states the same intent to a human reader but carries no timing (see
	 * {@link modulationOf}), so a score with the mark and no <swing> plays straight.
	 *
	 * <straight/> is the explicit "stop swinging" form; mdom normalizes it to an even 1:1 so
	 * that it cancels a carried swing rather than being mistaken for "no instruction here".
	 */
	swingOf(measure: Measure): Swing | null {
		for (const sound of measure.sounds) {
			if (sound.swing) {
				return sound.swing;
			}
		}
		return null;
	}

	/*
	 * A measure's <direction><direction-type><words> text directives (e.g. "ritardando",
	 * "dolce"), in document order. These are free-text expressions printed above the stave.
	 * `staffNumber` is the direction's <staff> ('1' when absent), so a multi-staff part
	 * prints each directive over the staff it was written for instead of piling every one
	 * of them onto the part's top staff.
	 * `lead` is the note the directive applies to: the next non-chord note after it (the
	 * same binding a pedal start uses), so per-note directives (guitar p-i-m-a fingering,
	 * picking marks) print over their own note instead of stacking on the measure's first.
	 * null when the direction trails the measure's last note, or falls at the bar's end.
	 * `placement` is the direction's placement attribute: 'below' prints under the staff (the
	 * convention for piano expression marks), anything else, including an absent attribute,
	 * keeps the above-staff default.
	 * `opensBar` says the direction falls on the measure's first beat, so it marks where the bar
	 * begins. `closesBar` says it falls where the bar's content runs out: written after a
	 * staff's last note (a "D.S. al Coda" before a <backup>), it applies to the barline, not to
	 * the next note in the file, which is another staff's from the bar's start.
	 * `format` is the <words> element's own formatting (see {@link TextFormat}), its style
	 * and weight falling back to the score's `<defaults><word-font>`.
	 * An <other-direction> rides along after its direction's words: `glyph` says its text is
	 * the SMuFL glyph its smufl attribute names, to draw in the notation font; without one
	 * (or with a name the font lacks) it is its own text, set like words.
	 * `position` is the element's own document position (see {@link positionOf}), null
	 * when it sets none.
	 */
	wordsOf(measure: Measure): {
		text: string;
		glyph: boolean;
		staffNumber: string;
		lead: Note | null;
		placement: Placement;
		opensBar: boolean;
		closesBar: boolean;
		directive: boolean;
		format: TextFormat;
		position: DocumentPosition | null;
	}[] {
		const wordFont = this.wordFontOf(measure);
		const written = measure.directions.flatMap((d) => {
			const staffNumber = d.staff;
			const placement = this.placementOf(d, 'above');
			const offset = this.offsetBeatsOf(d, measure);
			const beat = d.measureBeat === null ? null : d.measureBeat + offset;
			const opensBar = beat !== null && Math.abs(beat) < EPSILON;
			const closesBar =
				beat !== null && !opensBar && beat > measure.endBeat - EPSILON;
			let lead = closesBar ? null : d.nextNote;
			if (!closesBar && offset !== 0 && beat !== null) {
				lead = this.leadAtBeat(measure, beat);
			}
			const directive = d.getAttribute('directive') === 'yes';
			const at = {
				staffNumber,
				lead,
				placement,
				opensBar,
				closesBar,
				directive,
			};
			const words = d.wordsElements
				.filter((words) => words.text)
				.map((words) => ({
					...at,
					text: words.text,
					glyph: false,
					format: this.formatOf(words, wordFont, wordFont),
					position: this.positionOf(words, d),
				}));
			const others = d
				.childrenNamed('direction-type')
				.flatMap((type) => type.childrenNamed('other-direction'))
				.flatMap((other) => {
					const glyph = smuflGlyph(other.getAttribute('smufl'));
					const text = glyph ?? other.text?.trim();
					return text
						? [
								{
									...at,
									text,
									glyph: glyph !== undefined,
									format: this.formatOf(other, wordFont, wordFont),
									position: this.positionOf(other, d),
								},
							]
						: [];
				});
			return [...words, ...others];
		});
		// An <attributes><directive> is text above the staff at the measure's start, like a
		// tempo word, so it reads as a words direction opening the bar.
		const lead = this.leadAtBeat(measure, 0);
		const attributed = measure.childrenNamed('attributes').flatMap((attrs) =>
			attrs
				.childrenNamed('directive')
				.filter((el) => el.text)
				.map((el) => ({
					text: el.text ?? '',
					glyph: false,
					staffNumber: '1',
					lead,
					placement: 'above' as Placement,
					opensBar: true,
					closesBar: false,
					directive: true,
					format: this.formatOf(el, wordFont, wordFont),
					position: this.positionOf(el),
				})),
		);
		return [...attributed, ...written];
	}

	/*
	 * A direction's or harmony's <offset>, in beats: how far its mark sits from where it was
	 * written. The element counts divisions, so the part's divisions in effect at the
	 * measure turn it into beats. 0 when absent.
	 */
	private offsetBeatsOf(element: MElement, measure: Measure): number {
		const offset = Number(element.child('offset')?.text);
		if (!Number.isFinite(offset) || offset === 0) {
			return 0;
		}
		const divisions = this.divisionsAt(measure);
		return divisions > 0 ? offset / divisions : 0;
	}

	private divisionsAt(measure: Measure): number {
		const cached = this.divisionsByMeasure.get(measure);
		if (cached !== undefined) {
			return cached;
		}
		let divisions = 0;
		for (const m of measure.part.measures) {
			for (const attrs of m.childrenNamed('attributes')) {
				const value = Number(attrs.child('divisions')?.text);
				if (value > 0) {
					divisions = value;
				}
			}
			if (m === measure) {
				break;
			}
		}
		this.divisionsByMeasure.set(measure, divisions);
		return divisions;
	}

	/*
	 * The note a mark shifted to `beat` binds to: the lead of the last chord starting at or
	 * before it, or the measure's first when it lands before them all. null in an empty measure.
	 */
	private leadAtBeat(measure: Measure, beat: number): Note | null {
		let found: Note | null = null;
		let foundBeat = Number.NEGATIVE_INFINITY;
		for (const { lead } of measure.chords) {
			const at = this.measureBeatOf(lead);
			if (at === null) {
				continue;
			}
			if (
				at <= beat + EPSILON
					? at >= foundBeat
					: found === null && foundBeat === Number.NEGATIVE_INFINITY
			) {
				found = lead;
				foundBeat = at;
			}
		}
		return found;
	}

	/*
	 * A measure's <direction><direction-type><dynamics> markings (p, mf, sfz, …), in
	 * document order. MusicXML names the marking by the TAG (<dynamics><sfz/>), with
	 * <other-dynamics> carrying free text for anything outside the vocabulary, so the tag
	 * name is the text to print.
	 * `glyph` says the marking is spelled entirely out of the SMuFL dynamic letters and so
	 * draws in the notation font; an <other-dynamics> (or any tag with a stray letter)
	 * falls back to plain italic text.
	 * `staffNumber` and `lead` bind it the same way {@link wordsOf} binds a directive, and
	 * `format` is the <dynamics> element's own (see {@link TextFormat}), `position` its
	 * document position (see {@link positionOf}).
	 * Dynamics engrave BELOW the staff by convention, so that's the placement default here;
	 * an explicit placement="above" still wins.
	 */
	dynamicsOf(measure: Measure): {
		text: string;
		glyph: boolean;
		staffNumber: string;
		lead: Note | null;
		placement: Placement;
		format: TextFormat;
		position: DocumentPosition | null;
	}[] {
		const wordFont = this.wordFontOf(measure);
		const musicFont =
			measure.part.score.child('defaults')?.child('music-font') ?? null;
		return measure.directions.flatMap((d) => {
			const staffNumber = d.staff;
			const lead = d.nextNote;
			const placement = this.placementOf(d, 'below');
			return d.dynamics.flatMap((dynamics) => {
				const base = (text: string) =>
					this.dynamics.canSpell(text) ? musicFont : wordFont;
				return dynamics.marks.filter(Boolean).map((text) => ({
					text,
					glyph: this.dynamics.canSpell(text),
					format: this.formatOf(dynamics, null, base(text)),
					staffNumber,
					lead,
					placement,
					position: this.positionOf(dynamics, d),
				}));
			});
		});
	}

	/*
	 * A measure's symbol-style direction types, in document order, each already resolved to
	 * the SMuFL string it engraves: <damp>, <damp-all>, <eyeglasses>, <string-mute>,
	 * <staff-divide>, <principal-voice> and the generic <symbol> (a SMuFL glyph name).
	 * `staffNumber`, `lead` and `placement` bind it like {@link wordsOf}; they engrave above
	 * the staff unless the direction says otherwise.
	 * ponytail: <principal-voice> draws its start sign (the Hauptstimme/Nebenstimme letter
	 * and the opening hook) and its stop hook, with no line between them; <image> is not
	 * drawn, the canvas context loads no images.
	 */
	symbolsOf(measure: Measure): {
		glyph: string;
		staffNumber: string;
		lead: Note | null;
		placement: Placement;
	}[] {
		return measure.directions.flatMap((d) => {
			const bind = {
				staffNumber: d.staff,
				lead: d.nextNote,
				placement: this.placementOf(d, 'above'),
			};
			return d.childrenNamed('direction-type').flatMap((type) =>
				type.children
					.filter((child): child is MElement => child instanceof MElement)
					.flatMap((child) => {
						const glyph = this.directionSymbolOf(child);
						return glyph ? [{ glyph, ...bind }] : [];
					}),
			);
		});
	}

	// The SMuFL string a symbol-style direction-type child engraves, or '' when it is not one.
	private directionSymbolOf(child: MElement): string {
		const name = child.getAttribute('type') ?? '';
		const glyph = (glyphName: string | undefined) =>
			smuflGlyph(glyphName) ?? '';
		switch (child.tag) {
			case 'damp':
				return glyph('pluckedDamp');
			case 'damp-all':
				return glyph('pluckedDampAll');
			case 'eyeglasses':
				return glyph('miscEyeglasses');
			case 'string-mute':
				return (
					{
						on: glyph('stringsMuteOn'),
						off: glyph('stringsMuteOff'),
					}[name] ?? ''
				);
			case 'staff-divide':
				return (
					{
						down: glyph('staffDivideArrowDown'),
						up: glyph('staffDivideArrowUp'),
						'up-down': glyph('staffDivideArrowUpDown'),
					}[name] ?? ''
				);
			case 'principal-voice': {
				if (name === 'stop') {
					return glyph('analyticsEndStimme');
				}
				if (name !== 'start') {
					return '';
				}
				const letter =
					{
						Hauptstimme: glyph('analyticsHauptstimme'),
						Nebenstimme: glyph('analyticsNebenstimme'),
					}[child.getAttribute('symbol') ?? ''] ?? '';
				return letter + glyph('analyticsStartStimme');
			}
			case 'symbol':
				return glyph(child.text?.trim());
			default:
				return '';
		}
	}

	/*
	 * A measure's <direction-type><harp-pedals> diagrams, in document order: the pedal
	 * settings written as SMuFL glyphs in the order a harpist reads them, D C B | E F G A.
	 * A pedal raised is a flat, centered a natural, lowered a sharp; a string the diagram
	 * does not name draws centered. The diagram binds to staff and lead note like a
	 * dynamic and sits above the staff unless it says otherwise; `position` is its document
	 * position (see {@link positionOf}).
	 */
	harpPedalsOf(measure: Measure): {
		glyphs: string;
		staffNumber: string;
		lead: Note | null;
		placement: Placement;
		position: DocumentPosition | null;
	}[] {
		return measure.directions.flatMap((d) =>
			d.children
				.filter((node): node is MElement => node instanceof MElement)
				.filter((node) => node.tag === 'direction-type')
				.flatMap((type) => type.childrenNamed('harp-pedals'))
				.map((pedals) => {
					const settings = new Map<string, string>();
					for (const tuning of pedals.childrenNamed('pedal-tuning')) {
						const step = tuning.child('pedal-step')?.text?.trim();
						const alter = Number(tuning.child('pedal-alter')?.text);
						if (step) {
							settings.set(
								step,
								HARP_PEDAL_GLYPHS[Math.sign(alter) + 1] ?? HARP_PEDAL_CENTERED,
							);
						}
					}
					const glyph = (step: string) =>
						settings.get(step) ?? HARP_PEDAL_CENTERED;
					return {
						glyphs:
							['D', 'C', 'B'].map(glyph).join('') +
							HARP_PEDAL_DIVIDER +
							['E', 'F', 'G', 'A'].map(glyph).join(''),
						staffNumber: d.staff,
						lead: d.nextNote,
						placement: this.placementOf(d, 'above'),
						position: this.positionOf(pedals, d),
					};
				}),
		);
	}

	/*
	 * A measure's <direction><direction-type><rehearsal> section headers (e.g. "A", "B",
	 * "Chorus"), in document order. These are the boxed letters a player navigates a chart
	 * by, printed at the measure's left edge above the system's top staff.
	 * `format` is the <rehearsal> element's own (see {@link TextFormat}), `position` its
	 * document position (see {@link positionOf}).
	 */
	rehearsalsOf(measure: Measure): {
		text: string;
		format: TextFormat;
		position: DocumentPosition | null;
	}[] {
		const wordFont = this.wordFontOf(measure);
		return measure.directions.flatMap((d) =>
			d.rehearsals
				.filter((rehearsal) => rehearsal.text)
				.map((rehearsal) => ({
					text: rehearsal.text,
					format: this.formatOf(rehearsal, null, wordFont),
					position: this.positionOf(rehearsal),
				})),
		);
	}

	/*
	 * A measure's `<figured-bass>` stacks (the numerals a continuo player reads under the bass
	 * line), each bound to the note it sits under (the next non-`<chord/>` note, the binding a
	 * `<harmony>` uses). One string per `<figure>`, top of the stack first, each its
	 * `<prefix>` sign + `<figure-number>` + `<suffix>` sign; `parentheses="yes"` on the
	 * `<figured-bass>` wraps every figure of that stack.
	 *
	 * A stack with no printable figure at all (the empty `<figured-bass>` that lilypond_74a
	 * writes on purpose to see what breaks) is dropped rather than reserving a blank row.
	 * ponytail: `<extend>` is ignored; it draws the dash that carries a figure over the notes
	 * that follow it, and neither fixture in tmp/ writes one (74a says so in its own
	 * description). It would hang off this same lead note when one does.
	 */
	figuredBassesOf(measure: Measure): {
		lead: Note;
		figures: string[];
		/* The stack's document position (see positionOf), which its top figure takes. */
		position: DocumentPosition | null;
	}[] {
		const out: {
			lead: Note;
			figures: string[];
			position: DocumentPosition | null;
		}[] = [];
		for (const stack of measure.figuredBasses) {
			const lead = stack.nextNote;
			if (!lead) {
				continue;
			}
			const figures = stack.figures
				.map((figure) => {
					const text =
						(FIGURE_SIGN[figure.prefix ?? ''] ?? '') +
						(figure.number ?? '') +
						(FIGURE_SIGN[figure.suffix ?? ''] ?? '');
					return text && stack.parentheses ? `(${text})` : text;
				})
				.filter(Boolean);
			if (figures.length > 0) {
				out.push({ lead, figures, position: this.positionOf(stack) });
			}
		}
		return out;
	}

	/*
	 * A measure's navigation signs: <direction><direction-type><segno/> and <coda/>, in
	 * document order. These are the landmarks a D.S./D.C. jumps to. The words that drive them
	 * ("D.S. al Coda", "Fine") are ordinary <words> and already print via {@link wordsOf}; only
	 * the two GLYPHS are here.
	 * `position` is the sign's document position (see {@link positionOf}), null when it sets
	 * none.
	 * ponytail: the sign's placement is ignored; MusicXML lets a segno hang under the staff,
	 * but every one in tmp/ stands over its measure's start, which is where a player looks
	 * for it.
	 */
	navigationsOf(
		measure: Measure,
	): { kind: 'segno' | 'coda'; position: DocumentPosition | null }[] {
		return measure.directions.flatMap((d) =>
			d
				.childrenNamed('direction-type')
				.flatMap((type) => [
					...type
						.childrenNamed('segno')
						.map((sign) => ({ kind: 'segno' as const, sign })),
					...type
						.childrenNamed('coda')
						.map((sign) => ({ kind: 'coda' as const, sign })),
				])
				.map(({ kind, sign }) => ({ kind, position: this.positionOf(sign) })),
		);
	}

	/*
	 * A measure's <percussion> pictograms, <accordion-registration> signs and <scordatura>
	 * tunings, in document order, each bound to its staff and lead note the way
	 * {@link wordsOf} binds a directive, and above the staff unless placed below.
	 * mdom types none of the three, so they are read off the <direction-type> children.
	 * A pictogram engraves as its SMuFL glyph (see percussion-glyphs.ts); an
	 * <other-percussion>, or a value the schema does not list, prints as its words. A
	 * scordatura prints as one line naming each retuned string's pitch.
	 * Explicit SMuFL names override the usual pictogram; stick enclosures combine around
	 * the beater head when requested.
	 */
	pictogramsOf(measure: Measure): {
		symbol: Pictogram;
		staffNumber: string;
		lead: Note | null;
		placement: Placement;
	}[] {
		return measure.directions.flatMap((d) => {
			const placement = this.placementOf(d, 'above');
			return d
				.childrenNamed('direction-type')
				.flatMap((type) => type.children)
				.filter((child) => child instanceof MElement)
				.map((child) => this.pictogramElementOf(child))
				.filter((symbol) => symbol !== null)
				.map((symbol) => ({
					symbol,
					staffNumber: d.staff,
					lead: d.nextNote,
					placement,
				}));
		});
	}

	/*
	 * A measure's pedal markers, in document order: a start (or a sostenuto or resume)
	 * binds to the next note (the pedal goes down there), a stop (or a discontinue) to the
	 * previous note (the last note still held), and a change to the note it re-pedals on.
	 * Directions sit between notes, so each marker reads the notes either side of it.
	 *
	 * The type is read raw because mdom types neither discontinue nor resume. A resume
	 * picks a line up without a new down mark and a discontinue drops it without a release
	 * mark, so both carry `unmarked`. A continue only restates a pedal across a system
	 * break, and is skipped like a wedge's.
	 */
	pedalsOf(measure: Measure): PedalMark[] {
		const out: PedalMark[] = [];
		for (const direction of measure.directions) {
			for (const pedal of direction.pedals) {
				const raw = pedal.getAttribute('type');
				const type = PEDAL_TYPES[raw ?? ''];
				if (!type) {
					continue;
				}
				const lead =
					type === 'stop'
						? direction.previousNote
						: (direction.nextNote ??
							(type === 'change' ? direction.previousNote : null));
				if (!lead) {
					continue;
				}
				const line = pedal.line;
				const sign = pedal.getAttribute('sign');
				out.push({
					lead,
					type,
					number: pedal.number,
					line,
					// MusicXML: the signs show by default only when there is no line.
					sign: sign === null ? !line : sign === 'yes',
					abbreviated: pedal.getAttribute('abbreviated') === 'yes',
					sostenuto: raw === 'sostenuto',
					unmarked: raw === 'resume' || raw === 'discontinue',
				});
			}
		}
		return out;
	}

	/*
	 * A measure's wedge (hairpin) markers, in document order. A "crescendo"/"diminuendo"
	 * opens on the note that follows it. A "stop" sits at the moment the wedge finishes, so
	 * it closes on the note that FOLLOWS it too, unlike a pedal stop, which releases on the
	 * last note still held. An exporter that trails the stop after a measure's last note
	 * leaves no next note, so that case falls back to the previous one.
	 * The opening marker's type decides the direction, so a stop inherits it from its
	 * partner; a stop whose partner is missing (a malformed or sliced span) is dropped by
	 * the builder, not here.
	 * Hairpins engrave BELOW the staff by convention, so that's the placement default: an
	 * explicit placement="above" still wins.
	 * ponytail: a "continue" marker is ignored; it only re-states an open wedge mid-span.
	 */
	wedgesOf(measure: Measure): WedgeMark[] {
		const out: WedgeMark[] = [];
		for (const direction of measure.directions) {
			for (const wedge of direction.wedges) {
				const wedgeType = wedge.wedgeType;
				if (wedgeType === 'continue') {
					continue;
				}
				const type = wedgeType === 'stop' ? 'stop' : 'start';
				const lead =
					direction.nextNote ??
					(type === 'stop' ? direction.previousNote : null);
				if (!lead) {
					continue;
				}
				// A stop carries no direction of its own; read it off the marker that opened
				// the pair. Falling back to crescendo keeps a half-open span drawable.
				const opener =
					type === 'start'
						? wedgeType
						: (wedge.members.find((m) => m.wedgeType !== 'stop')?.wedgeType ??
							'crescendo');
				out.push({
					lead,
					type,
					number: wedge.number,
					crescendo: opener === 'crescendo',
					placement: this.placementOf(direction, 'below'),
					dash: lineDashOf(wedge),
					niente: wedge.getAttribute('niente') === 'yes',
					spread: Number.parseFloat(wedge.getAttribute('spread') ?? '') || null,
				});
			}
		}
		return out;
	}

	/*
	 * A part's <direction><octave-shift> spans (the 8va/8vb/15ma/15mb ottava brackets).
	 *
	 * MusicXML carries SOUNDING pitch, so an octave shift is a printing instruction: type="down"
	 * means print the notes an octave (or two, or three) LOWER than they sound and label the
	 * passage 8va, and type="up" is the mirror. `octaves` is signed the way vexflow's own
	 * octaveShift option reads it (positive draws lower), so it can be handed straight to the
	 * note builder.
	 *
	 * A start binds to the note that follows it and a stop to the note before it, and everything
	 * between them in document order is shifted. Paired by `number` across the part, so a span
	 * can cross barlines.
	 * ponytail: a start with no note after it in its own measure (or a stop with none before it)
	 * is dropped rather than reaching into the neighbouring measure, and a span that wraps onto a
	 * later system draws one bracket running right-to-left. Both need a fixture first.
	 */
	octaveShiftsOf(part: Part): OctaveShiftSpan[] {
		const notes = part.measures.flatMap((measure) => measure.notes);
		const indexOf = new Map(notes.map((note, index) => [note, index]));
		const spans: OctaveShiftSpan[] = [];
		const open = new Map<string, { from: Note; size: number; down: boolean }>();
		for (const measure of part.measures) {
			for (const direction of measure.directions) {
				for (const marker of direction.octaveShifts) {
					const type = marker.octaveShiftType;
					if (type === 'up' || type === 'down') {
						const from = direction.nextNote;
						if (from) {
							open.set(marker.number, {
								from,
								size: marker.size,
								down: type === 'down',
							});
						}
						continue;
					}
					if (type !== 'stop') {
						continue;
					}
					const opened = open.get(marker.number);
					open.delete(marker.number);
					const to = direction.previousNote;
					if (!opened || !to) {
						continue;
					}
					const first = indexOf.get(opened.from);
					const last = indexOf.get(to);
					if (first === undefined || last === undefined) {
						continue;
					}
					// <octave-shift size> is an interval (8, 15, 22), i.e. 1, 2 or 3 octaves.
					const octaves = Math.max(1, Math.round((opened.size - 1) / 7));
					// "8va"/"8vb" for one octave; two or three take the -ma/-mb suffixes.
					let suffix: string;
					if (octaves === 1) {
						suffix = opened.down ? 'va' : 'vb';
					} else {
						suffix = opened.down ? 'ma' : 'mb';
					}
					spans.push({
						notes: notes.slice(first, last + 1),
						octaves: opened.down ? octaves : -octaves,
						label: String(opened.size),
						suffix,
						above: opened.down,
					});
				}
			}
		}
		return spans;
	}

	/*
	 * A part's <direction-type><bracket> and <dashes> spans: the phrase/analysis brackets and
	 * the dashed line that trails a "cresc." or "rit.".
	 *
	 * Paired by type and `number` across the whole part, so a span can cross barlines. Both ends
	 * bind to the note that FOLLOWS the direction (the wedge convention, not the pedal one: a
	 * bracket's stop marks the moment the passage ends, and MusicXML writes it before the last
	 * note it covers). A stop trailing the measure's last note has no next note, so it falls
	 * back to the previous one.
	 *
	 * `line-end` belongs to the end it is written on: the start element's names the opening
	 * hook, the stop element's the closing hook. A <dashes> carries neither and is a plain
	 * dashed line.
	 * ponytail: a span whose start has no note after it, or that never stops, is dropped. One
	 * wrapping onto a later system is dropped by the drawing side rather than split the way
	 * buildTies splits a tie; neither needs handling until a fixture has one.
	 */
	directionLinesOf(part: Part): DirectionLineSpan[] {
		const spans: DirectionLineSpan[] = [];
		const open = new Map<
			string,
			{
				kind: 'bracket' | 'dashes';
				from: Note;
				above: boolean;
				dash: number[] | null;
				startEnd: LineEnd;
			}
		>();
		for (const measure of part.measures) {
			for (const direction of measure.directions) {
				for (const mark of [...direction.brackets, ...direction.dashes]) {
					// A <dashes> is the degenerate bracket: dashed, hookless, and typed
					// separately by mdom, so flatten the two into one shape here.
					const spec =
						mark instanceof Dashes
							? {
									kind: 'dashes' as const,
									type: mark.dashesType,
									lineEnd: 'none' as LineEnd,
									dash: [5, 5] as number[] | null,
								}
							: {
									kind: 'bracket' as const,
									type: mark.bracketType,
									lineEnd: mark.lineEnd,
									dash: lineDashOf(mark),
								};
					const key = `${spec.kind}:${mark.number}`;
					if (spec.type === 'stop') {
						const opened = open.get(key);
						open.delete(key);
						const to = direction.nextNote ?? direction.previousNote;
						if (opened && to && opened.from !== to) {
							spans.push({ ...opened, to, stopEnd: spec.lineEnd });
						}
						continue;
					}
					// 'continue' only re-states an open span, so only a 'start' opens one.
					if (spec.type !== 'start') {
						continue;
					}
					const from = direction.nextNote;
					if (!from) {
						continue;
					}
					open.set(key, {
						kind: spec.kind,
						from,
						above: this.placementOf(direction, 'above') === 'above',
						dash: spec.dash,
						startEnd: spec.lineEnd,
					});
				}
			}
		}
		return spans;
	}

	/*
	 * Each <harmony> in a measure paired with the lead note it sits above. A <harmony>
	 * applies to the note that follows it, resolved by Harmony.nextNote (the next
	 * non-<chord/> note). `frame` is the chord-diagram spec when the harmony carries a
	 * <frame>, else null. `source` is the Harmony element itself, kept for provenance.
	 * `placement` is the side the text prints on: the harmony's own placement, else below
	 * for a Roman numeral analysis (a <numeral> or <function>), which is where analysis
	 * sits, and above for a chord symbol.
	 *
	 * Deduplicated on (beat, text, frame): a <harmony> belongs to the part, but Guitar Pro
	 * repeats an identical one after every <backup> (once per voice), and drawing each
	 * copy stacks the same chord symbol/diagram on itself. The same chord genuinely
	 * restruck later in the measure lands on a different beat, so it survives.
	 */
	harmoniesOf(measure: Measure): {
		lead: Note;
		text: string;
		symbol: HarmonySymbol;
		frame: ChordFrame | null;
		framePosition: DocumentPosition | null;
		placement: Placement;
		source: Harmony;
		position: DocumentPosition | null;
	}[] {
		const harmonies: {
			lead: Note;
			text: string;
			symbol: HarmonySymbol;
			frame: ChordFrame | null;
			framePosition: DocumentPosition | null;
			placement: Placement;
			source: Harmony;
			position: DocumentPosition | null;
		}[] = [];
		const seen = new Set<string>();
		for (const harmony of measure.harmonies) {
			const offset = this.offsetBeatsOf(harmony, measure);
			const written = harmony.nextNote;
			const at = written ? this.measureBeatOf(written) : null;
			const lead =
				offset === 0 || at === null
					? written
					: (this.leadAtBeat(measure, at + offset) ?? written);
			if (!lead) {
				continue;
			}
			const analysis = this.analysisSymbol(harmony);
			const symbol = analysis ?? this.harmonySymbol(harmony);
			const text = symbol.text;
			const frame = this.frameOf(harmony);
			const frameElement = harmony.child('frame');
			if (!text && !frame) {
				continue;
			}
			const key = `${this.measureBeatOf(lead) ?? 0}|${text}|${JSON.stringify(frame)}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			const placement = harmony.placement ?? (analysis ? 'below' : 'above');
			harmonies.push({
				lead,
				text,
				symbol,
				frame,
				framePosition: frameElement ? this.positionOf(frameElement) : null,
				placement,
				source: harmony,
				position: this.positionOf(harmony, harmony),
			});
		}
		return harmonies;
	}

	/*
	 * The beat a measure's voices run out to: the latest onset+duration across them.
	 * Voices that end before this (e.g. one silent on the final beat via <forward>)
	 * are padded out to it so every voice spans the same range; see the trailing
	 * fill in VoiceTranslator.tickables.
	 */
	endBeatOf(voices: { chords: Chord[] }[]): number {
		let end = 0;
		for (const { chords } of voices) {
			const last = chords.at(-1);
			if (last) {
				end = Math.max(
					end,
					(this.measureBeatOf(last.lead) ?? 0) + (this.beatsOf(last.lead) ?? 0),
				);
			}
		}
		return end;
	}

	/*
	 * The part boundaries a measure's barlines must NOT run across: entry `i` means the barline
	 * between rendered part `i` and part `i + 1` stops instead of continuing down.
	 *
	 * A barline runs through the staves of ONE part (that is what a part's brace/bracket means)
	 * and stops at every part boundary, which is how an engraver separates one instrument from the
	 * next (MuseScore draws this score exactly so: the singer's barline stops, the guitar's runs
	 * through its notation and TAB together). A `<part-group>` is what joins parts back up, and it
	 * does so unless it declares `<group-barline>no</group-barline>` (MusicXML defines no default
	 * for an absent one), so a declared group is read as asking for common barlines.
	 *
	 * A nested pair that disagrees resolves to "any 'no' covering the boundary breaks it", since
	 * the inner group is the one closest to the staves, hence the two passes rather than deleting
	 * from a running set, which would let an outer 'yes' erase an inner 'no'.
	 */
	barlineBreaks(score: Score): Set<number> {
		const joined = new Set<number>();
		const broken = new Set<number>();
		for (const group of score.partGroups) {
			for (let at = group.fromPartIndex; at < group.toPartIndex; at++) {
				(group.barline === 'no' ? broken : joined).add(at);
			}
		}
		const breaks = new Set<number>();
		for (let at = 0; at < score.parts.length - 1; at++) {
			if (!joined.has(at) || broken.has(at)) {
				breaks.add(at);
			}
		}
		return breaks;
	}

	/*
	 * The `<part-group type="start">` markers per first part, in document order, which is
	 * outermost first, the order Score.partGroups lists spans that open on the same part. They
	 * carry what mdom has no getter for: display-text overrides and `<group-time>`.
	 */
	private groupStarts(score: Score): Map<number, MElement[]> {
		const starts = new Map<number, MElement[]>();
		let partCount = 0;
		for (const node of score.child('part-list')?.children ?? []) {
			if (!(node instanceof MElement)) {
				continue;
			}
			if (node.tag === 'score-part') {
				partCount++;
			} else if (
				node.tag === 'part-group' &&
				node.getAttribute('type') === 'start'
			) {
				starts.set(partCount, [...(starts.get(partCount) ?? []), node]);
			}
		}
		return starts;
	}

	/*
	 * The part runs of the `<part-group>`s that declare `<group-time/>`: their time signature
	 * prints once, large, across the whole run instead of on each stave. A group spanning a
	 * single part has nothing to span and keeps the plain signature.
	 */
	groupTimeSpans(score: Score): Array<{ fromPart: number; toPart: number }> {
		const starts = this.groupStarts(score);
		const taken = new Map<number, number>();
		return score.partGroups.flatMap((group) => {
			const k = taken.get(group.fromPartIndex) ?? 0;
			taken.set(group.fromPartIndex, k + 1);
			const marker = starts.get(group.fromPartIndex)?.[k];
			return marker?.child('group-time') &&
				group.toPartIndex > group.fromPartIndex
				? [{ fromPart: group.fromPartIndex, toPart: group.toPartIndex }]
				: [];
		});
	}

	/*
	 * The `<part-group>` spans that draw a connector, outermost first.
	 *
	 * Groups whose `<group-symbol>` is absent or 'none' draw nothing: they exist only to carry
	 * a name or a barline rule (see barlineBreaks), and one spanning a single part has nothing
	 * to connect. 'square' falls back to 'bracket' (vexflow draws no squared bracket).
	 *
	 * Names resolve through the display override and print-object (see labelOf), and
	 * the abbreviation is the short name later systems carry.
	 */
	partGroups(score: Score): PartGroup[] {
		const starts = this.groupStarts(score);
		const taken = new Map<number, number>();
		return score.partGroups
			.flatMap((group) => {
				const k = taken.get(group.fromPartIndex) ?? 0;
				taken.set(group.fromPartIndex, k + 1);
				const marker = starts.get(group.fromPartIndex)?.[k] ?? null;
				const symbol = this.groupSymbol(group.symbol);
				return symbol && group.toPartIndex > group.fromPartIndex
					? [
							{
								fromPart: group.fromPartIndex,
								toPart: group.toPartIndex,
								symbol,
								depth: group.depth,
								name: this.labelOf(
									marker?.child('group-name') ?? null,
									marker?.child('group-name-display') ?? null,
									group.name,
								),
								abbreviation: this.labelOf(
									marker?.child('group-abbreviation') ?? null,
									marker?.child('group-abbreviation-display') ?? null,
									group.abbreviation,
								),
							},
						]
					: [];
			})
			.sort((a, b) => a.depth - b.depth);
	}

	/*
	 * A part's printed names, from its <score-part>: the full name for the first system and
	 * the abbreviation for the systems after it. Each is null when the part declares none or
	 * hides it with print-object="no".
	 */
	partLabels(part: Part): { name: string | null; abbreviation: string | null } {
		const entry = part.score
			.child('part-list')
			?.childrenNamed('score-part')
			.find((scorePart) => scorePart.getAttribute('id') === part.id);
		return {
			name: this.labelOf(
				entry?.child('part-name') ?? null,
				entry?.child('part-name-display') ?? null,
				null,
			),
			abbreviation: this.labelOf(
				entry?.child('part-abbreviation') ?? null,
				entry?.child('part-abbreviation-display') ?? null,
				null,
			),
		};
	}

	/*
	 * The page, system and staff layout the document asks for (see DocumentLayout): its
	 * `<defaults>`, and the `<print>` layout each part leads a measure with.
	 */
	documentLayoutOf(score: Score): DocumentLayout {
		const prints = new Map<number, (LayoutBlock | null)[]>();
		score.parts.forEach((part, partIndex) => {
			part.measures.forEach((measure, m) => {
				const print = measure.print;
				if (!print) {
					return;
				}
				const row =
					prints.get(m) ??
					Array.from({ length: score.parts.length }, () => null);
				row[partIndex] = this.layoutBlockOf(
					print,
					print.newPage,
					this.blankPagesOf(print),
				);
				prints.set(m, row);
			});
		});
		return new DocumentLayout(
			this.layoutBlockOf(score.child('defaults'), false, 0),
			prints,
		);
	}

	/*
	 * The engraving sizes and glyphs the document's `<defaults><appearance>` sets (see
	 * Appearance), tenths read as px. A size that is no positive number is left out.
	 */
	appearanceOf(score: Score): Appearance {
		const appearance = score.child('defaults')?.child('appearance');
		const sizes = (tag: string) => {
			const sizes = new Map<string, number>();
			for (const element of appearance?.childrenNamed(tag) ?? []) {
				const type = element.getAttribute('type')?.trim();
				const value = Number(element.text?.trim() || Number.NaN);
				if (type && Number.isFinite(value) && value > 0) {
					sizes.set(type, value);
				}
			}
			return sizes;
		};
		const glyphs = new Map<string, string>();
		for (const element of appearance?.childrenNamed('glyph') ?? []) {
			const type = element.getAttribute('type')?.trim();
			const name = element.text?.trim();
			if (type && name) {
				glyphs.set(type, name);
			}
		}
		return new Appearance(sizes('line-width'), sizes('distance'), glyphs);
	}

	// The layout children of a `<defaults>` or `<print>`, tenths read as px (see DocumentLayout).
	private layoutBlockOf(
		element: MElement | null,
		newPage: boolean,
		blankPages: number,
	): LayoutBlock {
		const number = (parent: MElement | null | undefined, tag: string) => {
			const text = parent?.child(tag)?.text?.trim();
			const value = text ? Number(text) : Number.NaN;
			return Number.isFinite(value) ? value : null;
		};
		const page = element?.child('page-layout');
		// Odd-page margins first (page one is odd), then margins for both, then untyped; even
		// pages take their own when there are any.
		const margins = page?.childrenNamed('page-margins') ?? [];
		const pageMargins =
			margins.find((m) => m.getAttribute('type') === 'odd') ??
			margins.find((m) => m.getAttribute('type') === 'both') ??
			margins.find((m) => m.getAttribute('type') === null) ??
			null;
		const evenMargins =
			margins.find((m) => m.getAttribute('type') === 'even') ?? null;
		const system = element?.child('system-layout');
		const systemMargins = system?.child('system-margins');
		const staffDistances = new Map<string, number>();
		for (const staff of element?.childrenNamed('staff-layout') ?? []) {
			const distance = number(staff, 'staff-distance');
			if (distance !== null) {
				staffDistances.set(staff.getAttribute('number') ?? ANY_STAFF, distance);
			}
		}
		return {
			pageWidth: number(page, 'page-width'),
			pageHeight: number(page, 'page-height'),
			pageMargins: pageMargins ? this.pageMarginsOf(pageMargins) : null,
			evenPageMargins: evenMargins ? this.pageMarginsOf(evenMargins) : null,
			systemLeft: number(systemMargins, 'left-margin'),
			systemRight: number(systemMargins, 'right-margin'),
			systemDistance: number(system, 'system-distance'),
			topSystemDistance: number(system, 'top-system-distance'),
			staffDistances,
			newPage,
			blankPages,
		};
	}

	// A `<print blank-page>`, a count of whole pages; a malformed one is none. mdom keeps it raw.
	private blankPagesOf(print: MElement): number {
		const count = Number(print.getAttribute('blank-page'));
		return Number.isInteger(count) && count > 0 ? count : 0;
	}

	private pageMarginsOf(margins: MElement): PageMargins {
		const side = (tag: string) => Number(margins.child(tag)?.text) || 0;
		return {
			left: side('left-margin'),
			right: side('right-margin'),
			top: side('top-margin'),
			bottom: side('bottom-margin'),
		};
	}

	/*
	 * The heading printed above the first system: a centered title and subtitles, the
	 * lyricist's lines at the left and the composer's at the right. Null when the score names
	 * none of them.
	 *
	 * The page-one `<credit>`s win when there are any: they are what the editor printed,
	 * opus numbers and arranger lines included, while `<work>` and `<identification>` are
	 * catalog data. A credit lands by its `<credit-type>` when it has one, else by the side
	 * its text hangs from (halign, then justify, then default-x against the page width).
	 * A `rights` credit becomes the footer; other footers are dropped: page numbers by type, a
	 * bare number by its text, and anything in the page's lower half by its default-y. The topmost centered line is the
	 * title, the rest of the centered lines its subtitles. mdom has no getters for credits,
	 * so they are read off the elements.
	 *
	 * ponytail: credits print at fixed sizes in the text font, not at their default-x/
	 * default-y or font-size, and `<credit-image>` is dropped (the canvas context loads no
	 * images).
	 */
	headerOf(score: Score): ScoreHeader | null {
		const header = this.creditHeader(score) ?? this.catalogHeader(score);
		if (header.footer.length === 0) {
			header.footer = this.identificationRights(score);
		}
		const empty =
			!header.title &&
			header.subtitles.length === 0 &&
			header.left.length === 0 &&
			header.right.length === 0 &&
			header.symbols.length === 0 &&
			header.footer.length === 0;
		return empty ? null : header;
	}

	private creditHeader(score: Score): ScoreHeader | null {
		const layout = score
			.childrenNamed('defaults')[0]
			?.childrenNamed('page-layout')[0];
		const pageWidth = Number(layout?.childrenNamed('page-width')[0]?.text);
		const pageHeight = Number(layout?.childrenNamed('page-height')[0]?.text);
		const credits = score
			.childrenNamed('credit')
			.filter((credit) => (credit.getAttribute('page') ?? '1') === '1')
			.map((credit) => {
				const words = credit.childrenNamed('credit-words');
				const first = words[0];
				const symbols = credit
					.childrenNamed('credit-symbol')
					.map((symbol) => smuflGlyph(symbol.text?.trim() ?? '') || undefined)
					.filter((glyph): glyph is string => glyph !== undefined);
				const y = Number(first?.getAttribute('default-y'));
				return {
					type: credit.childrenNamed('credit-type')[0]?.text?.trim() ?? null,
					lines: words
						// A run of bare whitespace can only be a line break: the parser keeps
						// no whitespace-only text, so its newline reads back empty.
						.map((run) => (run.text?.trim() ? run.text : '\n'))
						.join('')
						.split('\n')
						.map((line) => line.trim())
						.filter((line) => line && !/^\d+$/.test(line)),
					symbols,
					side: this.creditSide(first, pageWidth),
					y: Number.isFinite(y) ? y : null,
				};
			});
		const footer = credits
			.filter((credit) => credit.type === 'rights')
			.flatMap((credit) => credit.lines);
		const placed = credits
			.filter(
				(credit) =>
					credit.type !== 'rights' &&
					(credit.lines.length > 0 || credit.symbols.length > 0),
			)
			.filter(
				(credit) =>
					(credit.lines.length > 0 || credit.symbols.length > 0) &&
					!(
						credit.y !== null &&
						Number.isFinite(pageHeight) &&
						credit.y < pageHeight / 2
					),
			);
		// MusicXML's y runs up the page, so the highest default-y prints first. Sorted only when
		// every credit is placed; otherwise document order is the only order there is.
		if (placed.every((credit) => credit.y !== null)) {
			placed.sort((a, b) => (b.y ?? 0) - (a.y ?? 0));
		}
		const header: ScoreHeader = {
			title: null,
			subtitles: [],
			left: [],
			right: [],
			symbols: [],
			footer,
		};
		const centered: string[] = [];
		for (const credit of placed) {
			header.symbols.push(...credit.symbols);
			const role = CREDIT_ROLES.get(credit.type ?? '') ?? null;
			if (credit.type !== null && !role) {
				continue;
			}
			switch (role ?? credit.side) {
				case 'title':
					header.title ??= credit.lines[0] ?? null;
					header.subtitles.push(...credit.lines.slice(1));
					break;
				case 'subtitle':
					header.subtitles.push(...credit.lines);
					break;
				case 'center':
					centered.push(...credit.lines);
					break;
				case 'left':
					header.left.push(...credit.lines);
					break;
				case 'right':
					header.right.push(...credit.lines);
					break;
			}
		}
		if (header.title === null) {
			header.title = centered.shift() ?? null;
		}
		header.subtitles.unshift(...centered);
		return placed.length > 0 || footer.length > 0 ? header : null;
	}

	private creditSide(
		words: MElement | undefined,
		pageWidth: number,
	): 'left' | 'center' | 'right' {
		const align =
			words?.getAttribute('halign') ?? words?.getAttribute('justify') ?? null;
		if (align === 'left' || align === 'center' || align === 'right') {
			return align;
		}
		const x = Number(words?.getAttribute('default-x'));
		if (!Number.isFinite(x) || !Number.isFinite(pageWidth)) {
			return 'left';
		}
		if (x < pageWidth / 3) {
			return 'left';
		}
		return x > (2 * pageWidth) / 3 ? 'right' : 'center';
	}

	/* The header the catalog fields give, for a score with no credits. */
	private catalogHeader(score: Score): ScoreHeader {
		const creators = score
			.childrenNamed('identification')
			.flatMap((identification) => identification.childrenNamed('creator'))
			.flatMap((creator) => {
				const text = creator.text?.trim();
				const role = CREDIT_ROLES.get(creator.getAttribute('type') ?? '');
				return text && (role === 'left' || role === 'right')
					? [{ text, role }]
					: [];
			});
		// A movement of a larger work prints under the work's title; either alone is the title.
		const work =
			score
				.childrenNamed('work')[0]
				?.childrenNamed('work-title')[0]
				?.text?.trim() || null;
		const movementTitle =
			score.childrenNamed('movement-title')[0]?.text?.trim() || null;
		const movementNumber =
			score.childrenNamed('movement-number')[0]?.text?.trim() || null;
		// A numeral or digits read as an ordinal ("2. Andante"); anything else ("No. 3") as a prefix.
		let movement = movementTitle ?? movementNumber;
		if (movementTitle && movementNumber) {
			const dot = /^[\dIVXLC]+$/i.test(movementNumber) ? '.' : '';
			movement = `${movementNumber}${dot} ${movementTitle}`;
		}
		const workNumber =
			score
				.childrenNamed('work')[0]
				?.childrenNamed('work-number')[0]
				?.text?.trim() || null;
		const title = work ?? movement;
		const subtitles = [
			...(work && workNumber ? [workNumber] : []),
			...(work && movement && movementTitle !== work ? [movement] : []),
		];
		return {
			title,
			subtitles,
			left: creators.filter((c) => c.role === 'left').map((c) => c.text),
			right: creators.filter((c) => c.role === 'right').map((c) => c.text),
			symbols: [],
			footer: [],
		};
	}

	/* The <identification><rights> lines, the copyright a score without a rights credit prints. */
	private identificationRights(score: Score): string[] {
		return score
			.childrenNamed('identification')
			.flatMap((identification) => identification.childrenNamed('rights'))
			.flatMap((rights) => (rights.text ?? '').split('\n'))
			.map((line) => line.trim())
			.filter(Boolean);
	}

	/*
	 * One printed name: the <*-display> element's text runs when there is one (it overrides the
	 * plain name, so it carries the formatting a score wants), else the plain element's text,
	 * else `fallback`. Null when the winning element says print-object="no" or has no text.
	 * <accidental-text> runs print as their Unicode sign.
	 */
	private labelOf(
		plain: MElement | null,
		display: MElement | null,
		fallback: string | null,
	): string | null {
		const source = display ?? plain;
		if (source?.getAttribute('print-object') === 'no') {
			return null;
		}
		if (display) {
			const text = display.children
				.map((run) => {
					if (!(run instanceof MElement)) {
						return '';
					}
					if (run.tag === 'accidental-text') {
						return ACCIDENTAL_TEXT[run.text?.trim() ?? ''] ?? '';
					}
					return run.tag === 'display-text' ? (run.text ?? '') : '';
				})
				.join('');
			if (text.trim()) {
				return text;
			}
		}
		return plain?.text?.trim() || fallback;
	}

	/*
	 * The repeat and volta (ending) structure a document's `<barline>`s describe, resolved
	 * for every measure in one document-order pass. The renderer (repeat dots, volta
	 * brackets) and the playback sequence (jump expansion) must agree about where a repeat
	 * block or an ending begins and ends, so the resolution lives here.
	 *
	 * An ending spans measures and MusicXML only marks its edges, so the middle of a run is
	 * only knowable in document order. Two encodings appear in the wild and both resolve
	 * here: the standard one marks `start` on the run's first measure and `stop` on its
	 * last, while some exporters restate `start`/`stop` on every measure of the run. A
	 * `stop` the next measure immediately reopens with the same number is that restatement:
	 * one bracket over the whole run and one ending for playback, not a pile of adjacent
	 * one-measure endings.
	 */
	measureRepeats(measures: readonly Measure[]): MeasureRepeat[] {
		const read = measures.map((measure) => this.readBarlines(measure));
		const out: MeasureRepeat[] = [];
		let open: string | null = null;
		let hidden = false;
		for (const [i, r] of read.entries()) {
			if (r.started !== null) {
				hidden = r.startHidden;
			}
			// A measure with no `start` of its own inherits the run already open over it.
			const number: string | null = r.started ?? open;
			const first = number !== null && open === null;
			const restated: boolean =
				r.closed !== null && read[i + 1]?.started === number;
			const last: boolean = r.closed !== null && !restated;
			open = number === null || last ? null : number;
			out.push({
				repeatBegin: r.repeatBegin,
				repeatEnd: r.repeatEnd,
				repeatTimes: r.repeatTimes,
				geometry: r.geometry,
				ending:
					number === null
						? null
						: {
								number,
								first,
								last,
								hidden,
								// An ending closes with a down hook only when something jumps back from it, or
								// when the piece stops there. `discontinue` asks for an open bracket outright;
								// otherwise the backward repeat is the signal: a final ending runs on into
								// the music, so its bracket stays open even though exporters routinely still
								// write `type="stop"` on it. At the last measure there's nothing to run into.
								open:
									last &&
									(r.closed === 'discontinue' ||
										(!r.repeatEnd && i < read.length - 1)),
							},
			});
		}
		return out;
	}

	/* The repeat/volta jumps for every measure, mapped from the shared repeat structure
	 * (measureRepeats, which the renderer reads too). An ending supersedes a co-located backward
	 * repeat: the iterator drives the back-jump off the ending instead. */
	measureJumps(measures: readonly Measure[]): Jump[][] {
		return this.measureRepeats(measures).map(
			({ repeatBegin, repeatEnd, repeatTimes, ending }, i) => {
				const jumps: Jump[] = [];
				const measure = measures[i];
				if (measure) {
					jumps.push(...this.navigationJumps(measure));
				}
				if (repeatBegin) {
					jumps.push({ type: 'repeatstart' });
				}
				if (ending) {
					jumps.push({
						type: 'repeatending',
						times: this.endingPasses(ending.number),
						last: ending.last,
						number: this.endingFirstPass(ending.number),
					});
				} else if (repeatEnd) {
					jumps.push({
						type: 'repeatend',
						times: Math.max(0, (repeatTimes ?? 2) - 1),
					});
				}
				return jumps;
			},
		);
	}

	/* The `<sound>` navigation attributes of a measure: landmarks (`segno`, `coda`), the jumps
	 * (`dacapo`, `dalsegno`, `tocoda`) and `fine`. Words like "D.C. al Fine" are not read: the
	 * attributes are what drive playback, and exporters that write the words write these too. */
	private navigationJumps(measure: Measure): Jump[] {
		const jumps: Jump[] = [];
		for (const sound of measure.sounds) {
			const segno = sound.getAttribute('segno');
			if (segno !== null) {
				jumps.push({ type: 'segno', id: segno });
			}
			const coda = sound.getAttribute('coda');
			if (coda !== null) {
				jumps.push({ type: 'coda', id: coda });
			}
			const fine = sound.getAttribute('fine');
			if (fine !== null && fine !== 'no') {
				jumps.push({ type: 'fine' });
			}
			const tocoda = sound.getAttribute('tocoda');
			if (tocoda !== null) {
				jumps.push({ type: 'tocoda', id: tocoda });
			}
			if (sound.getAttribute('dacapo') === 'yes') {
				jumps.push({ type: 'dacapo' });
			}
			const dalsegno = sound.getAttribute('dalsegno');
			if (dalsegno !== null) {
				jumps.push({ type: 'dalsegno', id: dalsegno });
			}
		}
		return jumps;
	}

	/** How many passes an ending covers, from its `<ending number>` ("1", "1,2", "1-3"). */
	private endingPasses(numberAttr: string | null): number {
		if (!numberAttr) {
			return 1;
		}
		let total = 0;
		for (const part of numberAttr.split(',')) {
			const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
			if (range) {
				total += Math.max(1, Number(range[2]) - Number(range[1]) + 1);
			} else if (part.trim()) {
				total += 1;
			}
		}
		return Math.max(1, total);
	}
	/** The FIRST pass an ending covers ("1" -> 1, "2,3" -> 2, "3-4" -> 3). Playback compares
	 * this across adjacent runs: a number that doesn't climb means the volta group restarted,
	 * i.e. the new run belongs to an enclosing repeat block. Defaults to 1 for a malformed or
	 * absent attribute, which reads as a restart and so errs toward splitting rather than
	 * merging two unrelated groups. */
	private endingFirstPass(numberAttr: string | null): number {
		return Number(numberAttr?.split(/[,-]/)[0]?.trim()) || 1;
	}
	/**
	 * One side of a metric modulation, as the drawing side wants it. Beams are counted rather
	 * than tracked as a run: a 'begin'/'continue' marker means that beam level carries on to the
	 * NEXT note, so counting them gives the beams to draw in the gap, while an 'end'/'backward
	 * hook' marker only says this note is beamed at all.
	 */
	private modulationNotesOf(notes: MetronomeNote[]): ModulationNote[] {
		return notes.map((note) => ({
			type: note.type,
			dots: note.dots,
			beamed: note.beams.length > 0,
			tiesToNext:
				note.child('metronome-tied')?.getAttribute('type') === 'start',
			beamsToNext: note.beams.filter(
				(beam) => beam === 'begin' || beam === 'continue',
			).length,
			tuplet: note.tuplet
				? { actual: note.tuplet.actual, type: note.tuplet.type }
				: null,
		}));
	}

	/**
	 * A `<direction>`'s placement attribute. MusicXML leaves it optional and the default is
	 * renderer's choice, so each caller names the fallback it wants: 'above' keeps an unmarked
	 * directive where it has always drawn, and the ones that engrave BELOW by convention
	 * (dynamics, wedges) say so.
	 */
	private placementOf(direction: Direction, fallback: Placement): Placement {
		return direction.placement ?? fallback;
	}

	/* One <direction-type> child as a {@link Pictogram}, or null when it is none of
	 * the three (words, dynamics and the rest have their own readers). */
	private pictogramElementOf(element: MElement): Pictogram | null {
		if (element.tag === 'percussion') {
			const pictogram = element.children.find((c) => c instanceof MElement);
			return pictogram ? this.pictogramOf(pictogram) : null;
		}
		if (element.tag === 'accordion-registration') {
			const middle = element.child('accordion-middle');
			return {
				kind: 'accordion',
				high: element.child('accordion-high') !== null,
				middle: middle ? Math.min(3, Number(middle.text) || 1) : 0,
				low: element.child('accordion-low') !== null,
			};
		}
		if (element.tag === 'scordatura') {
			const strings = element
				.childrenNamed('accord')
				.map((accord) => {
					const step = accord.child('tuning-step')?.text?.trim();
					if (!step) {
						return null;
					}
					const alter = Math.round(
						Number(accord.child('tuning-alter')?.text ?? 0) || 0,
					);
					const sign = (alter < 0 ? '♭' : '♯').repeat(Math.abs(alter));
					return `${accord.getAttribute('string') ?? '?'} = ${step}${sign}`;
				})
				.filter((text) => text !== null);
			return strings.length > 0
				? { kind: 'text', text: `Scordatura: ${strings.join(', ')}` }
				: null;
		}
		return null;
	}

	/* One <percussion> child as its glyph, or as its words when SMuFL has no glyph for it. */
	private pictogramOf(element: MElement): Pictogram | null {
		const value = element.text?.trim() ?? '';
		const tip = TIP_INDEX[element.getAttribute('tip') ?? ''] ?? 0;
		let glyph: string | undefined;
		const named = smuflGlyph(element.getAttribute('smufl'));
		if (named) {
			return { kind: 'glyph', glyph: named };
		}
		if (element.tag === 'timpani') {
			glyph = TIMPANI_GLYPH;
		} else if (element.tag === 'beater') {
			const beater = BEATER_GLYPHS[value];
			glyph = Array.isArray(beater) ? (beater[tip] ?? beater[0]) : beater;
		} else if (element.tag === 'stick') {
			const type = element.child('stick-type')?.text?.trim() ?? '';
			const material = element.child('stick-material')?.text?.trim() ?? '';
			const sticks = STICK_GLYPHS[type]?.[material];
			glyph = sticks?.[tip] ?? sticks?.[0];
			if (!glyph) {
				const text = `${material} ${type}`.trim();
				return text ? { kind: 'text', text } : null;
			}
			const enclosures = [
				element.getAttribute('parentheses') === 'yes' ? '\uE7E9' : '',
				element.getAttribute('dashed-circle') === 'yes' ? '\uE7EA' : '',
			].filter(Boolean);
			if (enclosures.length && sticks?.[0]) {
				return {
					kind: 'glyph',
					glyph,
					enclosure: {
						glyphs: enclosures,
						head: sticks[0],
						tip: sticks[tip] ? tip : 0,
					},
				};
			}
		} else {
			glyph = PERCUSSION_GLYPHS[element.tag]?.[value];
		}
		if (glyph) {
			return { kind: 'glyph', glyph };
		}
		return value ? { kind: 'text', text: value } : null;
	}

	/* A supplied measure box, in tenths read as px, when finite and positive. */
	measureWidthOf(measure: Measure): number | null {
		const raw = measure.getAttribute('width');
		const width = Number(raw);
		return raw !== null && Number.isFinite(width) && width > 0 ? width : null;
	}

	/*
	 * Where the document puts a mark, from MusicXML's position attributes: `y` its default-y,
	 * the text baseline in px above the staff's top line (null when unset), `dx` and `dy` its
	 * relative-x and relative-y, px right and up of wherever it lands (0 when unset). Tenths
	 * are read as px, as {@link documentLayoutOf} does. Null for an element setting none of
	 * the four. `side` is the side a default-y puts the mark on when its direction (`host`)
	 * names no placement: at or above the top line is above, under the bottom line below,
	 * and null in between or with a placement given, which then stands.
	 * `x` is default-x, in px from the measure start.
	 */

	positionOf(
		element: MElement,
		host: { placement: Placement | null } | null = null,
	): DocumentPosition | null {
		const read = (name: string) => {
			const value = element.getAttribute(name);
			const number = Number(value);
			return value !== null && Number.isFinite(number) ? number : null;
		};
		const x = read('default-x');
		const y = read('default-y');
		const dx = read('relative-x');
		const dy = read('relative-y');
		if (x === null && y === null && dx === null && dy === null) {
			return null;
		}
		let side: Placement | null = null;
		if (y !== null && host !== null && host.placement === null) {
			if (y >= 0) {
				side = 'above';
			} else if (y < -STAFF_LINES_SPAN) {
				side = 'below';
			}
		}
		return { x, y, dx: dx ?? 0, dy: dy ?? 0, side };
	}

	/* The score's `<defaults><word-font>`, read once per score. */
	private wordFontOf(measure: Measure): MElement | null {
		const score = measure.part.score;
		if (!this.wordFonts.has(score)) {
			this.wordFonts.set(
				score,
				score.child('defaults')?.child('word-font') ?? null,
			);
		}
		return this.wordFonts.get(score) ?? null;
	}

	/*
	 * A text element's formatting attributes. `fallback` supplies the face, style and weight
	 * the element leaves out (the word-font, for words). A size is read against `sizeBase`'s
	 * font-size, the document's default text size, so vexml keeps its own text sizes and a
	 * size the document raises or lowers scales them by the same ratio.
	 */
	private formatOf(
		element: MElement,
		fallback: MElement | null,
		sizeBase: MElement | null,
	): TextFormat {
		const attr = (name: string) =>
			element.getAttribute(name) ?? fallback?.getAttribute(name) ?? null;
		const style = attr('font-style');
		const weight = attr('font-weight');
		const enclosure = element.getAttribute('enclosure');
		const align =
			element.getAttribute('halign') ?? element.getAttribute('justify');
		const valign = element.getAttribute('valign');
		const underline = Number(element.getAttribute('underline') ?? 0);
		const rotation = Number(element.getAttribute('rotation') ?? 0);
		return {
			valign:
				valign === 'top' ||
				valign === 'middle' ||
				valign === 'bottom' ||
				valign === 'baseline'
					? valign
					: null,
			family: attr('font-family'),
			italic: style === null ? null : style === 'italic',
			bold: weight === null ? null : weight === 'bold',
			scale: fontScaleOf(
				element.getAttribute('font-size'),
				sizeBase?.getAttribute('font-size') ?? null,
			),
			enclosure:
				enclosure === 'none' || isEnclosureShape(enclosure) ? enclosure : null,
			underline: Number.isInteger(underline)
				? Math.min(Math.max(underline, 0), MAX_UNDERLINES)
				: 0,
			rotation: Number.isFinite(rotation)
				? Math.min(Math.max(rotation, -180), 180)
				: 0,
			align:
				align === 'left' || align === 'center' || align === 'right'
					? align
					: null,
		};
	}

	/*
	 * Swap the ASCII accidentals a <kind text="…"> suffix carries for an extension (e.g.
	 * "7(b9#11)") for the real Unicode signs ("7(♭9♯11)"), so they match the root's ♭/♯
	 * and pick up drawHarmony's smaller accidental sizing. An accidental in an extension
	 * always sits before its scale-degree number, so the digit lookahead avoids touching
	 * any letter that just happens to be a "b" (none of the suffix words use one, but the
	 * lookahead keeps it unambiguous).
	 */
	private harmonyExtensionSigns(kind: string): string {
		return kind.replace(/b(?=\d)/g, '♭').replace(/#(?=\d)/g, '♯');
	}

	/*
	 * A <harmony>'s printed chord symbol, e.g. "G7", "C", "F♯m": the <root-step> plus
	 * any <root-alter> sign, then the <kind text="…"> suffix MusicXML carries for
	 * exactly this (a major triad's text is empty, so it prints the bare root), falling
	 * back to the kind's conventional suffix when the exporter omits the attribute, or to
	 * its symbol form ("CΔ7", "C-7", "Cø7") under <kind use-symbols="yes">, then the
	 * <degree>s ("add9", "♭5", "no3"), stacked when <kind stack-degrees="yes">. A <bass>
	 * (slash chord) appends its <bass-separator> ("/" when absent) and
	 * "<bass-step><bass-alter>", e.g. "E♭/B♭"; with no <bass>, an <inversion> names the
	 * chord tone in the bass instead, e.g. "C/E".
	 */
	private harmonySymbol(harmony: Harmony): HarmonySymbol {
		const root = harmony.root;
		const step = root?.step ?? '';
		const alter = root ? (HARMONY_ALTER[root.alter ?? ''] ?? '') : '';
		const kindEl = harmony.child('kind');
		const kindValue = harmony.kind?.value ?? '';
		const symbols = kindEl?.getAttribute('use-symbols') === 'yes';
		const kind = this.harmonyExtensionSigns(
			(symbols ? HARMONY_KIND_SYMBOLS[kindValue] : undefined) ??
				harmony.kind?.text ??
				(kindEl ? (HARMONY_KIND_SUFFIX[kindValue] ?? '') : ''),
		);
		const degrees = this.degreeTexts(harmony);
		const [open, close] = this.degreeBrackets(kindEl, degrees.length > 0);
		const stacked =
			degrees.length > 0 && kindEl?.getAttribute('stack-degrees') === 'yes';
		const inline = degrees.join(open ? ',' : '');
		const head = step + alter + kind + open;
		const tail = close + this.bassText(harmony);
		return {
			text: head + inline + tail,
			head: stacked ? head : head + inline + tail,
			stack: stacked ? degrees : [],
			tail: stacked ? tail : '',
			hang: false,
		};
	}

	/*
	 * A <harmony>'s Roman numeral analysis, or null for a chord symbol: a <numeral>, or the
	 * deprecated <function> that holds the numeral as written ("V", "ii", or a T/S/D
	 * function letter). A <numeral-root> prints its text attribute when there is one, else
	 * its degree as a Roman numeral, lowercase for a minor or diminished kind; its
	 * <numeral-alter> sign goes on the side its location names. The kind adds its quality
	 * (° + ø, M for a major seventh), or its text attribute when the exporter spells it,
	 * then the figures for the inversion stack after it: 6 or 6/4 for a triad, 7, 6/5, 4/3
	 * or 4/2 for a seventh, or the <inversion text>. A <numeral-key> names the key the
	 * numeral reads in ahead of it, "G: IV", uppercase for major and lowercase for minor.
	 * <degree>s follow inline, as on a chord symbol.
	 */
	private analysisSymbol(harmony: Harmony): HarmonySymbol | null {
		const numeral = harmony.child('numeral');
		const fn = harmony.child('function');
		if (!numeral && !fn) {
			return null;
		}
		const kindEl = harmony.child('kind');
		const kindValue = harmony.kind?.value ?? '';
		const quality = NUMERAL_QUALITY[kindValue];
		const tones = HARMONY_KIND_TONES[kindValue] ?? [];
		const seventh = tones.length === 3 && tones[2]?.[0] === 7;
		const kindText = kindEl?.getAttribute('text');
		const suffix =
			kindText ?? quality?.suffix ?? HARMONY_KIND_SUFFIX[kindValue] ?? '';
		const inversionEl = harmony.child('inversion');
		const inversion = Number(inversionEl?.text ?? 0);
		const figures =
			inversionEl?.getAttribute('text')?.split('') ??
			(seventh
				? (SEVENTH_FIGURES[inversion] ?? [])
				: (TRIAD_FIGURES[inversion] ?? []));
		// The kind's text already spells a root-position seventh ("V7"); only an inversion's
		// figures replace it.
		const stack = kindText && inversion === 0 ? [] : figures;
		const degrees = this.degreeTexts(harmony).join('');
		const head = `${this.numeralKeyText(numeral)}${this.numeralText(numeral, fn, quality?.lower ?? false)}${suffix}`;
		return {
			text: head + stack.join('') + degrees,
			head: stack.length > 0 ? head : head + degrees,
			stack: [...stack].reverse(),
			tail: stack.length > 0 ? degrees : '',
			hang: true,
		};
	}

	/*
	 * The numeral itself: a <function>'s text as written, else the <numeral-root> (its text
	 * attribute, or its degree in Roman numerals, lowercased for a minor quality) with its
	 * <numeral-alter> sign, left of it unless location="right", and none when the alteration
	 * has print-object="no" (the raised 6 or 7 a minor key's numeral implies).
	 */
	private numeralText(
		numeral: ReturnType<Harmony['child']>,
		fn: ReturnType<Harmony['child']>,
		lower: boolean,
	): string {
		const rootEl = numeral?.child('numeral-root');
		if (!rootEl) {
			return fn?.text?.trim() ?? '';
		}
		const degree = Number(rootEl.text ?? 0);
		const roman = ROMAN_NUMERALS[degree - 1] ?? '';
		const root =
			rootEl.getAttribute('text') ?? (lower ? roman.toLowerCase() : roman);
		const alterEl = numeral?.child('numeral-alter');
		if (!alterEl || alterEl.getAttribute('print-object') === 'no') {
			return root;
		}
		const semitones = Number(alterEl.text ?? 0);
		const sign = (semitones > 0 ? '♯' : '♭').repeat(Math.abs(semitones));
		return alterEl.getAttribute('location') === 'right'
			? root + sign
			: sign + root;
	}

	/*
	 * A <numeral-key>'s key name and colon ahead of the numeral, "G: " or "e: ", spelled
	 * from its <numeral-fifths> like a key signature's tonic, and lowercase for any minor
	 * <numeral-mode>. Nothing without one, or when it has print-object="no".
	 */
	private numeralKeyText(numeral: ReturnType<Harmony['child']>): string {
		const keyEl = numeral?.child('numeral-key');
		if (!keyEl || keyEl.getAttribute('print-object') === 'no') {
			return '';
		}
		const fifths = Number(keyEl.child('numeral-fifths')?.text ?? 0);
		const minor =
			keyEl.child('numeral-mode')?.text?.trim().endsWith('minor') ?? false;
		const tonic = minor
			? MINOR_TONICS[fifths + 7]?.toLowerCase()
			: MAJOR_TONICS[fifths + 7];
		return tonic ? `${tonic}: ` : '';
	}

	/*
	 * The brackets <kind parentheses-degrees> or bracket-degrees wraps a harmony's degrees
	 * in, comma-separating them; none when there are no degrees to wrap.
	 */
	private degreeBrackets(
		kindEl: ReturnType<Harmony['child']>,
		any: boolean,
	): [string, string] {
		if (any && kindEl?.getAttribute('parentheses-degrees') === 'yes') {
			return ['(', ')'];
		}
		if (any && kindEl?.getAttribute('bracket-degrees') === 'yes') {
			return ['[', ']'];
		}
		return ['', ''];
	}

	/*
	 * The <degree>s a harmony prints after its kind suffix, in order, each as its type ("add",
	 * "no", or nothing for an alteration, unless <degree-type text> says otherwise), its
	 * <degree-alter> sign (+/- when plus-minus="yes") and its <degree-value> (or that
	 * value's text), behind the <degree-value symbol> glyph when there is one ("Δ7"). A
	 * degree with print-object="no" is already spelled by the kind text, which is how most
	 * exporters write it, so it adds nothing.
	 */
	private degreeTexts(harmony: Harmony): string[] {
		return harmony
			.childrenNamed('degree')
			.filter((degree) => degree.getAttribute('print-object') !== 'no')
			.map((degree) => {
				const valueEl = degree.child('degree-value');
				const alterEl = degree.child('degree-alter');
				const typeEl = degree.child('degree-type');
				const type = typeEl?.text?.trim() ?? 'alter';
				const typeText =
					typeEl?.getAttribute('text') ?? DEGREE_TYPE_TEXT[type] ?? '';
				const semitones = Number(alterEl?.text ?? 0);
				const plusMinus = alterEl?.getAttribute('plus-minus') === 'yes';
				const signs = plusMinus ? DEGREE_PLUS_MINUS : DEGREE_SIGNS;
				const sign = (semitones > 0 ? signs.up : signs.down).repeat(
					Math.abs(semitones),
				);
				const symbol =
					HARMONY_SYMBOLS[valueEl?.getAttribute('symbol') ?? ''] ?? '';
				const value =
					valueEl?.getAttribute('text') ?? valueEl?.text?.trim() ?? '';
				return typeText + sign + symbol + value;
			})
			.filter((text) => text !== '');
	}

	/*
	 * What a harmony prints after its chord for the bass note: a <bass> as its
	 * <bass-separator> (an empty one prints nothing between them) then the bass note; else
	 * an <inversion> as "/" and the chord tone it puts in the bass, spelled up from the root
	 * by the kind's intervals (inversion 1 of C major is E, of Cm is E♭), or its
	 * <inversion text> when the exporter spells it. Root position, or a kind with no
	 * stacked intervals to count up (Neapolitan, pedal, other), prints nothing.
	 */
	private bassText(harmony: Harmony): string {
		const bass = harmony.bass;
		if (bass?.step) {
			const separatorEl = harmony.child('bass')?.child('bass-separator');
			const separator = separatorEl ? (separatorEl.text ?? '') : '/';
			return `${separator}${bass.step}${HARMONY_ALTER[bass.alter ?? ''] ?? ''}`;
		}
		const inversionEl = harmony.child('inversion');
		const inversion = Number(inversionEl?.text ?? 0);
		if (!inversionEl || !(inversion > 0)) {
			return '';
		}
		const text = inversionEl.getAttribute('text');
		if (text !== null) {
			return `/${text}`;
		}
		const root = harmony.root;
		const tone = HARMONY_KIND_TONES[harmony.kind?.value ?? '']?.[inversion - 1];
		const rootIndex = STEPS.indexOf(root?.step ?? '');
		if (!root || !tone || rootIndex < 0) {
			return '';
		}
		const [degree, semitones] = tone;
		const step = STEPS[(rootIndex + degree - 1) % 7] as string;
		const target =
			(STEP_SEMITONES[rootIndex] as number) + (root.alter ?? 0) + semitones;
		const natural = STEP_SEMITONES[STEPS.indexOf(step)] as number;
		const alter = ((((target - natural) % 12) + 18) % 12) - 6;
		return `/${step}${alter === 0 ? '' : (HARMONY_ALTER[String(alter)] ?? '')}`;
	}

	/*
	 * The chord-diagram (<frame>) carried by a <harmony>, parsed into the ChordDiagramGlyph
	 * spec. MusicXML <fret>s are absolute, so they're shifted to be relative to
	 * <first-fret> (the top displayed fret line, drawn as the position label). Strings
	 * with no <frame-note> are muted ('x'); fret 0 is an open string. A <barre> spans
	 * from its `start` frame-note's string to its `stop` frame-note's string, at the
	 * shared (relative) fret. `fretCount` is <frame-frets>, the box's rows, and `unplayed`
	 * the <frame unplayed> text over a string with no frame-note, when the frame says.
	 * Returns null when the harmony carries no <frame>, or hides it with print-frame="no".
	 * MusicXML numbers strings high-to-low (1 = highest), matching the ChordDiagramGlyph's
	 * left-to-right (string 1 rightmost) convention.
	 */
	private frameOf(harmony: Harmony): ChordFrame | null {
		const frame = harmony.frame;
		if (!frame || harmony.getAttribute('print-frame') === 'no') {
			return null;
		}
		const numStrings = frame.strings;
		const frameNotes = frame.frameNotes;

		// Fret 0 is an open string, which is why `fretted` leaves it out.
		const absFret = new Map<number, number>();
		for (const fn of frameNotes) {
			absFret.set(fn.string, fn.fret);
		}
		const fretted = [...absFret.values()].filter((f) => f > 0);

		// <first-fret> is the absolute fret of the box's top line. Lead sheets often omit it, so
		// derive it: a chord with no open strings whose lowest fretted note is past the nut
		// starts the box at that fret instead of drawing a tall, mostly-empty box down from the
		// nut. Open strings pin the box to the nut (firstFret 1).
		const hasOpen = [...absFret.values()].includes(0);
		const firstFret =
			frame.firstFret ??
			(fretted.length > 0 && !hasOpen ? Math.min(...fretted) : 1);
		const toRelative = (abs: number) => (abs === 0 ? 0 : abs - firstFret + 1);

		const played = new Map<number, number>(); // string -> relative fret
		const barreStart = new Map<number, number>(); // relative fret -> from string
		const barres: ChordFrame['barres'] = [];
		for (const fn of frameNotes) {
			const relFret = toRelative(fn.fret);
			played.set(fn.string, relFret);
			if (fn.barre === 'start') {
				barreStart.set(relFret, fn.string);
			} else if (fn.barre === 'stop') {
				const from = barreStart.get(relFret);
				if (from !== undefined) {
					barres?.push({
						fromString: from,
						toString: fn.string,
						fret: relFret,
					});
				}
			}
		}

		// Position label, for movable shapes only (box not at the nut). Its number is the fret of
		// the lowest-sounding fretted string (the highest played string number), drawn beside
		// that note's row rather than at the box top: guitarists finger from the lowest string
		// up, so the number marks where the hand sits. The box layout still keys off firstFret
		// (the lowest fret), so the dots stay compact regardless of where the label lands.
		let position = firstFret;
		let positionText = 0;
		if (firstFret > 1 && fretted.length > 0) {
			const lowString = Math.max(
				...[...absFret].filter(([, f]) => f > 0).map(([s]) => s),
			);
			const lowFret = absFret.get(lowString) as number;
			position = lowFret;
			positionText = lowFret - firstFret;
		}

		const chord: ChordFrame['chord'] = [];
		for (let s = 1; s <= numStrings; s += 1) {
			chord.push([s, played.has(s) ? (played.get(s) as number) : 'x']);
		}
		const unplayed = frame.getAttribute('unplayed');
		return {
			chord,
			position,
			positionText,
			barres,
			fretCount: frame.frets,
			...(unplayed === null ? {} : { unplayed }),
		};
	}

	/*
	 * The <multiple-rest> count every staff of a measure agrees on, or null when they disagree (or
	 * when there is none). Collapsing removes the whole measure COLUMN, so a run declared on only
	 * some of a part's staves must not collapse: the others' music would be swallowed with it.
	 *
	 * A <measure-style> with no `number` applies to every staff, so an ordinary multirest agrees
	 * trivially; only an explicit per-staff disagreement trips this.
	 * ponytail: no fixture covers that case; no score in tmp/ writes one, and both hands of a
	 * piano rest together. It's here because the failure it prevents is deleting played music.
	 */
	private multiRestCountOf(measure: Measure | undefined): number | null {
		if (!measure) {
			return null;
		}
		const count = measure.getMultiRestCount('1');
		for (let staff = 2; staff <= measure.staveCount; staff++) {
			if (measure.getMultiRestCount(String(staff)) !== count) {
				return null;
			}
		}
		return count;
	}

	/** MusicXML `<group-symbol>` -> the connector vexml draws. null means "draw nothing". */
	private groupSymbol(
		symbol: PartGroupSpan['symbol'],
	): PartGroup['symbol'] | null {
		switch (symbol) {
			case 'brace':
				return 'brace';
			case 'bracket':
			// vexflow has no squared-bracket connector; a bracket is the nearest reading.
			case 'square':
				return 'bracket';
			case 'line':
				return 'line';
			default:
				return null;
		}
	}

	/* One measure's `<barline>`s flattened: MusicXML allows several (a left repeat and a right one),
	 * and the edge each sits on is already implied by its repeat direction and ending type. */
	private readBarlines(measure: Measure): BarlineRead {
		const read: BarlineRead = {
			repeatBegin: false,
			repeatEnd: false,
			repeatTimes: null,
			started: null,
			startHidden: false,
			closed: null,
			geometry: { ...NO_BARLINE_GEOMETRY },
		};
		for (const barline of measure.barlines) {
			const winged = this.wingedOf(barline.childrenNamed('repeat')[0]);
			if (barline.repeat === 'forward') {
				read.repeatBegin = true;
				read.geometry.beginWinged = winged;
			} else if (barline.repeat === 'backward') {
				read.repeatEnd = true;
				read.repeatTimes = barline.repeatTimes;
				read.geometry.endWinged = winged;
			}
			const ending = barline.ending;
			const endingElement = barline.childrenNamed('ending')[0];
			const jog = this.tenthsOf(endingElement, 'end-length');
			if (ending?.type === 'start') {
				read.started = ending.number;
				read.startHidden = endingElement?.getAttribute('print-object') === 'no';
				read.geometry.startJog = jog;
				read.geometry.textX = this.tenthsOf(endingElement, 'text-x');
			} else if (ending) {
				read.closed = ending.type;
				read.geometry.endJog = jog;
			}
		}
		return read;
	}

	/* A `<repeat winged>`, or 'none' (the MusicXML default) when absent or unknown. */
	private wingedOf(repeat: MElement | undefined): Winged {
		const value = repeat?.getAttribute('winged');
		return WINGED.find((w) => w === value) ?? 'none';
	}

	/* A tenths attribute, or null when absent or not a number. */
	private tenthsOf(element: MElement | undefined, name: string): number | null {
		const raw = element?.getAttribute(name);
		const value = raw == null ? Number.NaN : Number(raw);
		return Number.isFinite(value) ? value : null;
	}
}

/**
 * A chord symbol laid out for drawing: `head` (root, kind, any opening bracket), a
 * column of degrees stacked bottom-up beside it, then `tail` (closing bracket, bass).
 * Inline degrees ride in `head`, leaving `stack` and `tail` empty. `text` is the whole
 * symbol on one line, as a fret-box title prints it. A Roman numeral's inversion figures
 * ride in `stack` too, with `hang` set: the column hangs from the numeral's top, so a lone
 * 7 reads as a superscript and a 6/5 straddles the baseline, where a chord symbol's
 * degrees stand on it.
 */
export type HarmonySymbol = {
	text: string;
	head: string;
	stack: string[];
	tail: string;
	hang: boolean;
};

/**
 * A metronome mark: the beat-unit's vexflow duration code plus its bpm. The optional
 * fields are the printed variants: augmentation dots on either unit, a second unit for
 * the note-equals-note metric modulation, and the parenthesized form. Only the drawing
 * path reads them; playback needs `bpm` alone.
 */
/** Where a part's measure numbers go, from its `<print><measure-numbering>`. */
export type MeasureNumberingMark = {
	/** 'none' numbers nothing, 'measure' every measure, 'system' each system's first. */
	value: 'none' | 'measure' | 'system';
	system: SystemRelation | null;
	staff: string | null;
};

/** MusicXML's system-relation-number: which part of the system shows the number. */
export type SystemRelation = (typeof SYSTEM_RELATIONS)[number];

const SYSTEM_RELATIONS = [
	'only-top',
	'only-bottom',
	'also-top',
	'also-bottom',
	'none',
] as const;

export type TempoMark = {
	duration: string;
	bpm: number;
	dots?: number;
	duration2?: string | null;
	dots2?: number;
	parenthesis?: boolean;
	justify?: 'left' | 'center' | 'right' | null;
	/** The `<metronome>`'s document position (see ScoreReader.positionOf). */
	position?: DocumentPosition | null;
};

/**
 * A `<sound><swing>` instruction: the on-beat:off-beat duration ratio (`first`:`second`)
 * and `unit`, the swung note value in quarter-note beats (eighth = 0.5, 16th = 0.25). An
 * even `first === second` is straight time.
 */
export type Swing = { first: number; second: number; unit: number };

/*
 * One voice as ONE staff draws it (see ScoreReader.staffVoices). `chords` is the voice
 * restricted to the notes that sit on this staff; `beamChords` is the voice's full,
 * unrestricted chord list on the staff that owns it and null everywhere else, so a beamed run
 * crossing staves is grouped exactly once (off the notes the `<beam>` markers were written
 * on), and the beam then spans both staves instead of breaking at the staff change.
 */
/** One of a measure's voices: the staff mdom gives it (its first note's) and its chords. */
export type MeasureVoice = {
	staff: string;
	chords: Chord[];
};

export type StaffVoice = {
	chords: Chord[];
	beamChords: Chord[] | null;
	/* The whole voice, every staff's share of it: what a staff it only partly sits on
	 * holds the rest of its time with (see VoiceTickablesOptions.run). */
	run: Chord[];
};

/** Which side of the staff a `<direction>` prints on. */
export type Placement = 'above' | 'below';

/**
 * Where a document puts a mark, from its position attributes (see ScoreReader.positionOf):
 * `y` the default-y baseline in px above the staff's top line, or null for none; `dx` and
 * `dy` the relative-x and relative-y, px right and up of the position that applies; `side`
 * the side the default-y implies when the direction names no placement, else null.
 */
export type DocumentPosition = {
	/** Default-x from the measure start (frame offsets use the musical anchor). */
	x?: number | null;
	y: number | null;
	dx: number;
	dy: number;
	side: Placement | null;
};

// The staff's five lines span four spaces, 40 tenths: a default-y under this is below the staff.
const STAFF_LINES_SPAN = 40;

/*
 * The formatting a text element (<words>, <dynamics>, <rehearsal>) asks for. A null field is
 * one the document leaves to the element's own default: a rehearsal mark is bold and boxed
 * unless told otherwise, a words direction upright and bare.
 */
export type TextFormat = {
	/** The text's vertical alignment on default-y under documentLayout. */
	valign: 'top' | 'middle' | 'bottom' | 'baseline' | null;
	/** The MusicXML font-family the document names, a comma-separated list of faces; null for
	 * none. Drawn only under Config.documentFonts. */
	family: string | null;
	italic: boolean | null;
	bold: boolean | null;
	/** The size as a ratio to the element's usual size; 1 when the document sets none. */
	scale: number;
	enclosure: EnclosureShape | 'none' | null;
	/** How many lines run under the text; 0 for none. */
	underline: number;
	/** Degrees clockwise the text turns, -180 to 180; 0 for upright. */
	rotation: number;
	/** Where the text sits on its anchor x, from halign, else justify. */
	align: 'left' | 'center' | 'right' | null;
};

// SMuFL harpPedalRaised, harpPedalCentered, harpPedalLowered, indexed by the sign of the
// pedal-alter plus one (a flat is raised, a sharp lowered), and harpPedalDivider.
const HARP_PEDAL_GLYPHS = ['\uE680', '\uE681', '\uE682'];
const HARP_PEDAL_CENTERED = '\uE681';
const HARP_PEDAL_DIVIDER = '\uE683';

// More underlines than this is no longer a line under the text but a block.
const MAX_UNDERLINES = 3;

function isEnclosureShape(value: string | null): value is EnclosureShape {
	return (ENCLOSURE_SHAPES as readonly (string | null)[]).includes(value);
}

/*
 * What a <percussion>, <accordion-registration> or <scordatura> direction draws: a SMuFL
 * glyph, plain text, or the accordion's register circle with a dot for each rank it sounds
 * (`middle` counts its 0 to 3 dots). See ScoreReader.pictogramsOf.
 */
export type Pictogram =
	| {
			kind: 'glyph';
			glyph: string;
			enclosure?: { glyphs: string[]; head: string; tip: number };
	  }
	| { kind: 'text'; text: string }
	| { kind: 'accordion'; high: boolean; middle: number; low: boolean };

// A <direction><direction-type><pedal> spanner marker, bound to the lead note it
// anchors. `line` is line="yes" (a bracket line rather than the "Ped…*" signs) and `sign`
// whether the signs print, with the line or instead of it; `abbreviated` prints "P." for
// "Ped.". `sostenuto` marks a start that downs the sostenuto pedal ("Sost. Ped."), and
// `unmarked` an end drawn with no sign or hook: a resume's start or a discontinue's stop.
export type PedalMark = {
	lead: Note;
	type: 'start' | 'change' | 'stop';
	number: string;
	line: boolean;
	sign: boolean;
	abbreviated: boolean;
	sostenuto: boolean;
	unmarked: boolean;
};

// Each MusicXML <pedal type> as the end of a span it marks.
const PEDAL_TYPES: Record<string, PedalMark['type'] | undefined> = {
	start: 'start',
	sostenuto: 'start',
	resume: 'start',
	change: 'change',
	stop: 'stop',
	discontinue: 'stop',
};

// A <direction><direction-type><wedge> (hairpin) marker, bound to the lead note it anchors
// the same way a PedalMark is. `crescendo` is carried on every marker of the pair so the
// stop knows which way its hairpin opens; `placement` likewise, so both ends agree on the
// side of the staff.
export type WedgeMark = {
	lead: Note;
	type: 'start' | 'stop';
	number: string;
	crescendo: boolean;
	placement: Placement;
	dash: number[] | null;
	/* The hairpin's point is a circle, not a vertex (<wedge niente="yes"> on its point end). */
	niente: boolean;
	// <wedge spread> in tenths, or null when this end doesn't say. MusicXML puts the mouth's
	// spread on the crescendo's stop or the diminuendo's start and 0 on the point's end.
	spread: number | null;
};

/*
 * One <octave-shift> span: the notes it covers, how far to shift them when drawing (signed
 * the way vexflow's octaveShift option reads it: positive draws lower), and the bracket
 * label that goes over or under them ("8" + "va", "15" + "mb", …). See ScoreReader.octaveShiftsOf.
 */
export type OctaveShiftSpan = {
	notes: Note[];
	octaves: number;
	label: string;
	suffix: string;
	above: boolean;
};

/** How a <bracket> terminates at one of its ends. */
export type LineEnd = 'up' | 'down' | 'arrow' | 'none';

/*
 * One <direction-type><bracket> or <dashes> span: the notes it runs between, the side of the
 * staff it prints on, its stroke pattern (null = solid, else a canvas dash array) and the hook
 * each end terminates in. A <dashes> is the degenerate bracket (dashed, hookless), which is
 * why the two share a span type. See ScoreReader.directionLinesOf.
 */
export type DirectionLineSpan = {
	/** Which element drew it, the `<line-width>` type it is drawn at. */
	kind: 'bracket' | 'dashes';
	from: Note;
	to: Note;
	above: boolean;
	dash: number[] | null;
	startEnd: LineEnd;
	stopEnd: LineEnd;
};

/* A `line-type` attribute (<bracket>, <slur>, …) -> the canvas dash array to stroke it
 * with; null is a solid line.
 * ponytail: 'wavy' falls back to solid; a wavy line needs the SMuFL squiggle run that
 * VibratoBracket draws for trills, not a dash pattern. No fixture asks for one. */
export const LINE_TYPE_DASH: Record<string, number[] | null> = {
	solid: null,
	dashed: [5, 5],
	dotted: [1, 3],
	wavy: null,
};

/* The canvas dash array an element's `line-type`, `dash-length` and `space-length` ask for,
 * or null for a solid line. The lengths are in tenths of a staff space, drawn at one pixel
 * each (a staff space is ten). dash-length shapes only a dashed line; space-length the gap
 * of a dashed or dotted one. */
export function lineDashOf(element: {
	getAttribute(name: string): string | null;
}): number[] | null {
	const lineType = element.getAttribute('line-type') ?? 'solid';
	const base = LINE_TYPE_DASH[lineType] ?? null;
	if (!base) {
		return null;
	}
	const length = (name: string): number | null => {
		const value = Number(element.getAttribute(name));
		return value > 0 ? value : null;
	};
	const dash = lineType === 'dashed' ? length('dash-length') : null;
	const space = length('space-length');
	return [dash ?? base[0] ?? 5, space ?? base[1] ?? 5];
}

// MusicXML <root-alter>/<bass-alter> semitones -> the printed accidental sign, using the
// real Unicode music symbols (♯ ♭ ♮). 0 prints an explicit natural: rare in a root, but
// MusicXML carries it when the chart wants the sign drawn. An absent <root-alter> maps to
// nothing (no sign), so plain roots stay bare.
const HARMONY_ALTER: Record<string, string> = { '1': '♯', '-1': '♭', '0': '♮' };

// <degree-type> value -> the word printed before the degree when <degree-type text> is
// absent: "Cadd9", "C7no3", and an alteration prints just its sign ("C7♭5").
const DEGREE_TYPE_TEXT: Record<string, string> = {
	add: 'add',
	subtract: 'no',
	alter: '',
};

// A <degree-alter> sign per semitone, as accidentals or, with plus-minus="yes", as +/-.
const DEGREE_SIGNS = { up: '♯', down: '♭' };
const DEGREE_PLUS_MINUS = { up: '+', down: '-' };

// The diatonic steps and their semitones above C, for spelling an <inversion>'s bass note.
const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

// The chord tones above the root, bottom up, as [scale degree, semitones], per <kind>:
// inversion n puts tone n in the bass. Kinds with no stacked tones to count (the augmented
// sixths, Neapolitan, pedal, Tristan, other, none) are left out, so their inversions print
// no bass note.
const THIRD: [number, number] = [3, 4];
const FLAT_THIRD: [number, number] = [3, 3];
const FIFTH: [number, number] = [5, 7];
const SEVENTH: [number, number] = [7, 10];
const MAJOR_SEVENTH: [number, number] = [7, 11];
const HARMONY_KIND_TONES: Record<string, [number, number][]> = {
	major: [THIRD, FIFTH],
	minor: [FLAT_THIRD, FIFTH],
	augmented: [THIRD, [5, 8]],
	diminished: [FLAT_THIRD, [5, 6]],
	dominant: [THIRD, FIFTH, SEVENTH],
	'major-seventh': [THIRD, FIFTH, MAJOR_SEVENTH],
	'minor-seventh': [FLAT_THIRD, FIFTH, SEVENTH],
	'diminished-seventh': [FLAT_THIRD, [5, 6], [7, 9]],
	'augmented-seventh': [THIRD, [5, 8], SEVENTH],
	'half-diminished': [FLAT_THIRD, [5, 6], SEVENTH],
	'major-minor': [FLAT_THIRD, FIFTH, MAJOR_SEVENTH],
	'major-sixth': [THIRD, FIFTH, [6, 9]],
	'minor-sixth': [FLAT_THIRD, FIFTH, [6, 9]],
	'dominant-ninth': [THIRD, FIFTH, SEVENTH, [9, 14]],
	'major-ninth': [THIRD, FIFTH, MAJOR_SEVENTH, [9, 14]],
	'minor-ninth': [FLAT_THIRD, FIFTH, SEVENTH, [9, 14]],
	'dominant-11th': [THIRD, FIFTH, SEVENTH, [9, 14], [11, 17]],
	'major-11th': [THIRD, FIFTH, MAJOR_SEVENTH, [9, 14], [11, 17]],
	'minor-11th': [FLAT_THIRD, FIFTH, SEVENTH, [9, 14], [11, 17]],
	'dominant-13th': [THIRD, FIFTH, SEVENTH, [9, 14], [11, 17], [13, 21]],
	'major-13th': [THIRD, FIFTH, MAJOR_SEVENTH, [9, 14], [11, 17], [13, 21]],
	'minor-13th': [FLAT_THIRD, FIFTH, SEVENTH, [9, 14], [11, 17], [13, 21]],
	'suspended-second': [[2, 2], FIFTH],
	'suspended-fourth': [[4, 5], FIFTH],
	power: [FIFTH],
};

// The Roman numerals for scale degrees 1 to 7.
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// How a <kind> reads on a Roman numeral: lowercase for a minor third, and the quality sign
// after it. A kind left out falls back to its chord-symbol suffix in HARMONY_KIND_SUFFIX.
const NUMERAL_QUALITY: Record<string, { lower: boolean; suffix: string }> = {
	major: { lower: false, suffix: '' },
	minor: { lower: true, suffix: '' },
	augmented: { lower: false, suffix: '+' },
	diminished: { lower: true, suffix: '°' },
	dominant: { lower: false, suffix: '' },
	'major-seventh': { lower: false, suffix: 'M' },
	'minor-seventh': { lower: true, suffix: '' },
	'diminished-seventh': { lower: true, suffix: '°' },
	'augmented-seventh': { lower: false, suffix: '+' },
	'half-diminished': { lower: true, suffix: 'ø' },
	'major-minor': { lower: true, suffix: 'M' },
};

// The figures an <inversion> stacks after a Roman numeral, top first: a triad's root
// position prints none, a seventh chord's prints its 7.
const TRIAD_FIGURES: string[][] = [[], ['6'], ['6', '4']];
const SEVENTH_FIGURES: string[][] = [['7'], ['6', '5'], ['4', '3'], ['4', '2']];

// The major and minor tonic per <numeral-fifths>, from 7 flats (index 0) to 7 sharps.
const MAJOR_TONICS = [
	'C♭',
	'G♭',
	'D♭',
	'A♭',
	'E♭',
	'B♭',
	'F',
	'C',
	'G',
	'D',
	'A',
	'E',
	'B',
	'F♯',
	'C♯',
];
const MINOR_TONICS = [
	'A♭',
	'E♭',
	'B♭',
	'F',
	'C',
	'G',
	'D',
	'A',
	'E',
	'B',
	'F♯',
	'C♯',
	'G♯',
	'D♯',
	'A♯',
];

// The harmony symbols <kind use-symbols> and <degree-value symbol> draw in place of
// letters, as the spec spells them: a triangle for major, then - + ° ø.
const HARMONY_SYMBOLS: Record<string, string> = {
	major: '△',
	minor: '-',
	augmented: '+',
	diminished: '°',
	'half-diminished': 'ø',
};

// The suffix per <kind> value under use-symbols="yes". A kind with no symbol to draw
// (dominant, sus, the function kinds) is left out and keeps its letters. major-minor
// draws only the minor symbol: the spec has the major seventh come from a <degree-value
// symbol="major">.
const HARMONY_KIND_SYMBOLS: Record<string, string> = {
	minor: '-',
	augmented: '+',
	diminished: '°',
	'major-seventh': '△7',
	'minor-seventh': '-7',
	'diminished-seventh': '°7',
	'augmented-seventh': '+7',
	'half-diminished': 'ø7',
	'major-minor': '-',
	'minor-sixth': '-6',
	'major-ninth': '△9',
	'minor-ninth': '-9',
	'major-11th': '△11',
	'minor-11th': '-11',
	'major-13th': '△13',
	'minor-13th': '-13',
};

// Fallback suffix per <kind> value, for the exporters that omit the text attribute;
// without it a D power chord prints as a bare "D", which reads as a major triad.
// An empty string is the right answer for 'major' and 'none' (the bare root).
const HARMONY_KIND_SUFFIX: Record<string, string> = {
	major: '',
	minor: 'm',
	augmented: '+',
	diminished: 'dim',
	dominant: '7',
	'major-seventh': 'maj7',
	'minor-seventh': 'm7',
	'diminished-seventh': 'dim7',
	'augmented-seventh': '+7',
	'half-diminished': 'm7♭5',
	'major-minor': 'mMaj7',
	'major-sixth': '6',
	'minor-sixth': 'm6',
	'dominant-ninth': '9',
	'major-ninth': 'maj9',
	'minor-ninth': 'm9',
	'dominant-11th': '11',
	'major-11th': 'maj11',
	'minor-11th': 'm11',
	'dominant-13th': '13',
	'major-13th': 'maj13',
	'minor-13th': 'm13',
	'suspended-second': 'sus2',
	'suspended-fourth': 'sus4',
	Neapolitan: 'N',
	Italian: 'It',
	French: 'Fr',
	German: 'Ger',
	pedal: 'ped',
	power: '5',
	Tristan: 'Tr',
	other: '',
	none: '',
};

/*
 * A <figured-bass><figure>'s <prefix>/<suffix> value -> the sign printed beside its numeral,
 * in the same real Unicode accidentals HARMONY_ALTER uses so the two faces match.
 * ponytail: 'slash'/'back-slash' ask for a stroke THROUGH the numeral (the continuo sign for a
 * raised third) and print as a trailing solidus instead: striking a glyph needs a drawn line
 * over measured text, not a character, and SMuFL's pre-slashed figbass glyphs exist only for a
 * few specific numerals (not lilypond_74a's "127"). Draw the stroke if a real continuo score
 * makes the difference matter.
 */
const FIGURE_SIGN: Record<string, string> = {
	sharp: '♯',
	flat: '♭',
	natural: '♮',
	'double-sharp': '𝄪',
	'sharp-sharp': '♯♯',
	'flat-flat': '𝄫',
	slash: '/',
	'back-slash': '\\',
};

/*
 * Reads score semantics straight off the mdom: staff voice selection, meter lengths,
 * and the direction/harmony markers a measure carries. Stateless: the layout
 * (measuring) and draw passes must read identically, so the predicates live here.
 */

/* Which kinds of stave a render shows, from Config.showTabs/showNotation. Both are asked
 * together everywhere a part's stave rows are derived, so they travel as one value. */
/* The Unicode sign of each <accidental-text> value a name's display runs may carry. */
const ACCIDENTAL_TEXT: Record<string, string> = {
	sharp: '\u266F',
	flat: '\u266D',
	natural: '\u266E',
	'double-sharp': '\uD834\uDD2A',
	'flat-flat': '\uD834\uDD2B',
};

/** A `<part-group>` span: the run of parts it brackets, and the connector to draw. */
export type PartGroup = {
	/** Index into the rendered `parts` array of the group's first and last part. */
	fromPart: number;
	toPart: number;
	symbol: 'brace' | 'bracket' | 'line';
	/** Nesting depth: 0 is outermost, and each level draws further left of the system. */
	depth: number;
	/** The group's `<group-name>`, printed left of its symbol; null when it declares none. */
	name: string | null;
	/** The group's `<group-abbreviation>`, printed in its place on systems after the first. */
	abbreviation: string | null;
};

/** The heading above the first system (see ScoreReader.headerOf). */
export type ScoreHeader = {
	title: string | null;
	/** Centered under the title, top to bottom. */
	subtitles: string[];
	/** Lyricist, poet and translator lines, printed at the left. */
	left: string[];
	/** Composer and arranger lines, printed at the right. */
	right: string[];
	/** SMuFL glyphs from `<credit-symbol>`, centered in a row under the subtitles. */
	symbols: string[];
	/** The copyright lines, centered at the foot of the score. */
	footer: string[];
};

/* Where a `<credit-type>` or `<creator type>` prints in the header; a type missing here
 * (rights, page number, part name) prints nothing. */
const CREDIT_ROLES = new Map<string, 'title' | 'subtitle' | 'left' | 'right'>([
	['title', 'title'],
	['subtitle', 'subtitle'],
	['composer', 'right'],
	['arranger', 'right'],
	['lyricist', 'left'],
	['poet', 'left'],
	['translator', 'left'],
]);

/** A `<barline><fermata>`: the edge it sits on, its shape, and whether it hangs below. */
export type BarlineFermata = {
	location: 'left' | 'right';
	shape: string;
	inverted: boolean;
};

export type MeasureRepeat = {
	/** A left `<repeat direction="forward"/>`: the measure opens a repeat block. */
	repeatBegin: boolean;
	/** A right `<repeat direction="backward"/>`: the measure closes one. */
	repeatEnd: boolean;
	/** How many times a backward repeat plays the block; null when there is no repeat end. */
	repeatTimes: number | null;
	/** The ending (volta) run covering this measure, or null when it's outside one. */
	ending: MeasureEnding | null;
	/** How this measure's own repeat signs and ending bracket are shaped. */
	geometry: BarlineGeometry;
};

/** The `<repeat winged>` values: extensions above and below a repeat sign's thick line. */
export const WINGED = [
	'none',
	'straight',
	'curved',
	'double-straight',
	'double-curved',
] as const;
export type Winged = (typeof WINGED)[number];

/**
 * The shape attributes on one measure's `<repeat>` and `<ending>` elements. Each is read
 * off the measure's own barlines: an ending's start jog and label offset sit on its
 * `start`, its end jog on its `stop`, so the run's first and last measures carry them.
 * Lengths are in tenths; null means the attribute is absent.
 */
export type BarlineGeometry = {
	beginWinged: Winged;
	endWinged: Winged;
	/** `end-length` on this measure's `start` ending: the bracket's left jog. */
	startJog: number | null;
	/** `end-length` on this measure's `stop` ending: the bracket's right jog. */
	endJog: number | null;
	/** `text-x` on this measure's `start` ending: the label's x from the bracket's start. */
	textX: number | null;
};

export const NO_BARLINE_GEOMETRY: BarlineGeometry = {
	beginWinged: 'none',
	endWinged: 'none',
	startJog: null,
	endJog: null,
	textX: null,
};

export type MeasureEnding = {
	/** The raw `<ending number>`: a list or range like `"1"`, `"1,2"`, `"1-3"`. */
	number: string;
	/** Whether the run starts here (its bracket's left hook). */
	first: boolean;
	/** Whether the run ends here (its bracket's right hook, and where playback jumps). */
	last: boolean;
	/** The bracket stays open on the right, with no down hook. */
	open: boolean;
	/** `<ending print-object="no">` on the run's start: it still plays, but no bracket is drawn. */
	hidden: boolean;
};

type BarlineRead = {
	repeatBegin: boolean;
	repeatEnd: boolean;
	repeatTimes: number | null;
	started: string | null;
	/** The starting `<ending print-object="no">`: the bracket is not drawn. */
	startHidden: boolean;
	closed: 'stop' | 'discontinue' | null;
	geometry: BarlineGeometry;
};

/* The sign a beat-level span draws on a beat, in place of that beat's notes (see noteStyleOf). */
export type StyleSign =
	| { kind: 'beat-repeat'; slashes: number; dots: boolean }
	| { kind: 'beat-slash'; unit: number; dots: boolean };

/* A tab <bend> as the file spells it (see bendOf). */
export type TabBendMark = {
	/** <bend-alter>: 2 is a whole step; negative bends the pitch down. */
	semitones: number;
	release: boolean;
	/** <pre-bend/>: bent before the string is struck. */
	preBend: boolean;
	/** The angled legs of standard notation, or the curved ones of tab (the default). */
	shape: 'curved' | 'angled';
	/** The trimmed <with-bar> text ("dip", "scoop", free text, often empty); null when absent. */
	bar: string | null;
};

/* What a span does to one note: hide it, and maybe stand a sign where it was. */
export type NoteStyle = { hidden: boolean; sign: StyleSign | null };

const NOT_STYLED: NoteStyle = { hidden: false, sign: null };

/* What a staff's <measure-style> draws in place of one measure's notes (see measureStyleOf). */
export type MeasureStyleMark =
	| {
			kind: 'measure-repeat';
			/** How many measures the repeated pattern holds (the element's text). */
			count: number;
			/** How many slashes the sign carries; 1 unless the document says otherwise. */
			slashes: number;
			/** Which measure of the pattern this is, 0 the first. */
			bar: number;
	  }
	| {
			kind: 'beat-repeat';
			slashes: number;
			/** Dots either side of the slashes (`use-dots="yes"`). */
			dots: boolean;
			/** The quarter-note beat each sign starts on. */
			beats: number[];
			/** The measure's length in quarter-note beats. */
			length: number;
	  }
	| {
			kind: 'beat-slash';
			/** How long each slash stands for, in quarter-note beats. */
			unit: number;
			/** An augmentation dot after each slash of a dotted unit (`use-dots="yes"`). */
			dots: boolean;
			beats: number[];
			length: number;
	  };

type BeatRepeatStyle = {
	slashes: number;
	dots: boolean;
	unit: number;
	/** The <except-voice>s, which keep drawing their notes under the style. */
	except: string[];
};
type SlashStyle = {
	stems: boolean;
	dots: boolean;
	unit: number;
	except: string[];
};
type Span = { from: number; to: number };

/* One staff's <measure-style> regions within one measure (see ScoreReader.staffStylesOf). */
type StaffStyle = {
	repeat: { count: number; slashes: number; bar: number } | null;
	beatRepeats: Array<BeatRepeatStyle & Span>;
	slashes: Array<SlashStyle & Span>;
	/** The measure's length in quarter-note beats: its meter, else its content. */
	length: number;
};

/*
 * A measure's <measure-style> children for one staff, in document order, each at the beat
 * its <attributes> block falls on: the next note's onset, or the measure's end when no note
 * follows (the same rule Measure.clefChanges uses).
 */
function measureStyleEvents(
	measure: Measure,
	staffNumber: string,
): Array<{ beat: number; element: MElement }> {
	const events: Array<{ beat: number; element: MElement }> = [];
	const children = measure.children;
	children.forEach((node, index) => {
		if (!(node instanceof MElement) || node.tag !== 'attributes') {
			return;
		}
		const styles = node.childrenNamed('measure-style').filter((style) => {
			const number = style.getAttribute('number');
			return number === null || number === staffNumber;
		});
		if (styles.length === 0) {
			return;
		}
		const next = children
			.slice(index + 1)
			.find(
				(child): child is Note =>
					child instanceof MElement && child.tag === 'note',
			);
		const beat = next?.measureBeat ?? measure.endBeat;
		for (const style of styles) {
			for (const element of style.children) {
				if (element instanceof MElement && STYLE_TAGS.has(element.tag)) {
					events.push({ beat, element });
				}
			}
		}
	});
	return events;
}

const STYLE_TAGS = new Set(['measure-repeat', 'beat-repeat', 'slash']);

// A <slash-type> note type -> its length in quarter-note beats.
const NOTE_TYPE_BEATS: Record<string, number> = {
	breve: 8,
	whole: 4,
	half: 2,
	quarter: 1,
	eighth: 0.5,
	'16th': 0.25,
	'32nd': 0.125,
};

/*
 * How long each sign of a <beat-repeat> or <slash> stands for, from its <slash-type> and
 * <slash-dot>s, in quarter-note beats; null when it names no type, so the meter decides.
 */
function slashUnit(style: MElement): number | null {
	const type = style.child('slash-type')?.text;
	const beats = type ? NOTE_TYPE_BEATS[type] : undefined;
	if (!beats) {
		return null;
	}
	let unit = beats;
	let dot = beats / 2;
	for (const _ of style.childrenNamed('slash-dot')) {
		unit += dot;
		dot /= 2;
	}
	return unit;
}

/*
 * The meter's beat in quarter-note beats: the beat-type's note, or a dotted one in a
 * compound meter (6/8, 9/8, 12/8 count in dotted quarters). A quarter with no meter.
 */
function beatUnit(time: Time | null): number {
	const beats = Number(time?.beats);
	const beatType = Number(time?.beatType);
	if (!beats || !beatType) {
		return 1;
	}
	const unit = 4 / beatType;
	return beatType >= 8 && beats > 3 && beats % 3 === 0 ? unit * 3 : unit;
}

/* The onset of each `unit`-long sign across a measure `length` beats long. */
function beatsAcross(length: number, unit: number): number[] {
	const beats: number[] = [];
	for (let beat = 0; beat < length - EPSILON; beat += unit) {
		beats.push(beat);
	}
	return beats;
}

/* Offsets from each endpoint, right and up in tenths (px at the document's staff
 * scale). Only a continuation's outgoing point uses x2/y2. */
export type BezierPoint = { x: number | null; y: number | null };
export type DocumentBezier = { start: BezierPoint; end: BezierPoint };

export function bezierPointOf(
	element: MElement,
	outgoing = false,
): BezierPoint {
	const suffix =
		outgoing &&
		element.tag === 'slur' &&
		element.getAttribute('type') === 'continue'
			? '2'
			: '';
	const read = (axis: string): number | null => {
		const value = element.getAttribute(`bezier-${axis}${suffix}`);
		return value !== null &&
			value.trim() !== '' &&
			Number.isFinite(Number(value))
			? Number(value)
			: null;
	};
	return { x: read('x'), y: read('y') };
}

/* mdom owns pairing and onset order, including across backup and system breaks. */
export function curveSegmentOf<
	T extends MElement & { members: T[]; partner: T | null },
>(
	marker: T,
): {
	end: T;
	bezier: DocumentBezier | null;
} | null {
	const span = marker.members;
	const opener = span[0];
	const closer =
		marker.getAttribute('type') === 'start' ? marker.partner : span.at(-1);
	// members includes every same-number marker between the paired ends, including
	// overlapping slurs in another voice. Only split at this span's continuations.
	const members = span.filter(
		(candidate) =>
			candidate === marker ||
			candidate === closer ||
			(candidate.getAttribute('type') === 'continue' &&
				candidate.members[0] === opener),
	);
	const end = members[members.indexOf(marker) + 1];
	if (!end) {
		return null;
	}
	const startPoint = bezierPointOf(marker, true);
	const endPoint = bezierPointOf(end);
	const bezier = [startPoint.x, startPoint.y, endPoint.x, endPoint.y].some(
		(v) => v !== null,
	)
		? { start: startPoint, end: endPoint }
		: null;
	return { end, bezier };
}
