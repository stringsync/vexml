// vet-ignore-file compact-files: came in at this size from the upstream repository; splitting it is a refactor of its own
import {
	type Chord,
	type Lyric,
	type MElement,
	type Ornament as MOrnament,
	type Note,
	Score,
	type Technical,
} from '@stringsync/mdom';
import {
	Accidental,
	Metrics,
	Modifier,
	Ornament,
	type StaveNote,
	Stroke,
} from 'vexflow/core';
import { ACCIDENTAL_CODES } from './chord-translator';
import { FERMATA_GLYPHS, NORMAL_FERMATA_GLYPHS } from './fermata-glyphs';
import { FingeringAnnotation } from './fingering-annotation';
import { FontFamilies } from './font-families';
import { fontScaleOf } from './font-scale';
import { FootnoteAnnotation } from './footnote-annotation';
import { harmonicPitchOf } from './harmonic-kind';
import { LyricAnnotation } from './lyric-annotation';
import type { LyricJustify } from './lyric-mark';
import { NonArpeggioBracket } from './non-arpeggio-bracket';
import { NoteheadArticulation } from './notehead-articulation';
import { PauseMark } from './pause-mark';
import type { ScoreReader } from './score-reader';
import { smuflGlyph } from './smufl';
import { StaveArticulation, type TieClearance } from './stave-articulation';
import { StaveOrnament } from './stave-ornament';
import { StaveTremolo } from './stave-tremolo';
import { StringNumberAnnotation } from './string-number-annotation';
import { UnbrokenArpeggio } from './unbroken-arpeggio';

/*
 * Translates an mdom chord's marks to the vexflow modifiers that hang off the StaveNote built
 * from it: its <articulations>, <ornaments>, <technical> marks, fermata, arpeggio, and its
 * <lyric> verses, which are a sibling of <notations> in the file but the same kind of thing
 * here.
 *
 * Kept apart from ChordTranslator, which builds the note these decorate, because none of it
 * touches the notehead: the note is finished before any of this lands on it.
 */
export class NotationTranslator {
	// Each score's `<defaults><lyric-font>`s, read once per score.
	private readonly lyricFonts = new WeakMap<Score, MElement[]>();

	constructor(
		private readonly reader: ScoreReader,
		private readonly opts: NotationTranslatorOptions = {},
	) {}

	/* Attach everything `chord` asks for to the StaveNote built from it. */
	attach(staveNote: StaveNote, chord: Chord): void {
		const lead = chord.lead;
		// <notations print-object="no"> hides every mark it holds; the lyrics are a sibling.
		if (!this.hidesNotations(lead)) {
			this.addArticulations(staveNote, chord);
			this.addTechnicals(staveNote, chord);
			this.addOrnaments(staveNote, chord);
			this.addAccidentalMarks(staveNote, lead);
			this.addFermata(staveNote, lead);
			this.addArpeggio(staveNote, lead);
			this.addNonArpeggiate(staveNote, chord);
			this.addOtherNotations(staveNote, lead);
		}
		const footnote = lead.child('footnote')?.text?.trim();
		if (footnote) {
			staveNote.addModifier(new FootnoteAnnotation(footnote), 0);
		}
		if (lead.getAttribute('print-lyric') !== 'no') {
			this.addLyrics(staveNote, lead);
		}
	}

	/* A rest takes only its fermata: its other notations have no notehead to sit on. */
	attachRest(staveNote: StaveNote, chord: Chord): void {
		if (!this.hidesNotations(chord.lead)) {
			this.addFermata(staveNote, chord.lead);
		}
	}

	/* Grace notes carry scaled-down articulations placed outside the stave (Behind Bars p. 130). */
	attachGrace(graceNote: StaveNote, chord: Chord): void {
		if (!this.hidesNotations(chord.lead)) {
			this.addArticulations(graceNote, chord);
		}
	}

	private hidesNotations(note: Note): boolean {
		const groups = note.childrenNamed('notations');
		return (
			groups.length > 0 &&
			groups.every((group) => group.getAttribute('print-object') === 'no')
		);
	}

	private addArticulations(staveNote: StaveNote, chord: Chord): void {
		const note = chord.lead;
		const isGrace = note.isGrace;
		const tieSides = this.tieClearanceOf(chord);
		let slurSides: TieClearance | undefined;
		const slurClearance = (): TieClearance => {
			if (slurSides === undefined) {
				slurSides = this.slurClearanceOf(chord);
			}
			return slurSides;
		};
		for (const mark of note.articulationMarks) {
			const name = mark.articulationType;
			const brush = BRUSH_ORNAMENTS[name];
			if (brush) {
				const ornament = new Ornament(brush.type);
				if (brush.glyph) {
					ornament.setText(brush.glyph);
				}
				staveNote.addModifier(ornament);
				continue;
			}
			if (name === 'breath-mark' || name === 'caesura') {
				// <breath-mark>tick</breath-mark> draws the tick; anything else the comma.
				const kind =
					name === 'breath-mark' && mark.text?.trim() === 'tick'
						? 'breath-tick'
						: name;
				staveNote.addModifier(
					new PauseMark(kind, mark.placement === 'below' ? 'below' : 'above'),
				);
				continue;
			}
			if (name === 'strong-accent') {
				// Behind Bars p. 117 (artic-strong-above): strong accents sit upright above
				// the stave regardless of stem direction unless MusicXML asks for below.
				const position =
					mark.placement === 'below'
						? Modifier.Position.BELOW
						: Modifier.Position.ABOVE;
				staveNote.addModifier(
					this.styleGraceArticulation(
						new StaveArticulation('a^')
							.setPosition(position)
							.clearTie(tieSides)
							.clearSlur(slurClearance()),
						staveNote,
						isGrace,
					),
				);
				continue;
			}
			if (
				name === 'tenuto' &&
				(mark.placement === 'above' || mark.placement === 'below')
			) {
				// Behind Bars p. 122 (slur-tenuto-centre-head): honour explicit
				// tenuto placement so stem-side tenutos sit between stem and slur.
				const position =
					mark.placement === 'above'
						? Modifier.Position.ABOVE
						: Modifier.Position.BELOW;
				staveNote.addModifier(
					this.styleGraceArticulation(
						new StaveArticulation('a-')
							.setPosition(position)
							.clearTie(tieSides),
						staveNote,
						isGrace,
					),
				);
				continue;
			}
			const code = ARTICULATION_CODES[name];
			if (code) {
				const articulation = new NoteheadArticulation(code)
					.setSide(staveNote)
					.clearTie(tieSides);
				if (isGrace) {
					if (mark.placement === 'above' || mark.placement === 'below') {
						articulation.setPosition(
							mark.placement === 'above'
								? Modifier.Position.ABOVE
								: Modifier.Position.BELOW,
						);
						if (Array.isArray(code)) {
							articulation.setText(
								mark.placement === 'above' ? code[0] : code[1],
							);
						}
					}
					this.styleGraceArticulation(articulation, staveNote, true);
				} else if (name === 'staccato') {
					articulation.setBetweenLines();
				} else if (name === 'accent') {
					// Behind Bars p. 120 (artic-accent-outside-stave): accents sit outside the
					// stave, and pp. 121–122 (slur-artic-accent-outside): outside slur endpoints.
					articulation.setBetweenLines(false).clearSlur(slurClearance());
				} else if (name === 'staccatissimo') {
					// Behind Bars p. 120 (artic-accent-outside-stave): staccato wedges sit
					// outside the stave rather than colliding with stave lines.
					articulation.setBetweenLines(false);
				}
				staveNote.addModifier(articulation);
			}
		}
		// <other-articulation>: its smufl glyph on the notehead side like any articulation,
		// both faces when the font has the name's Above/Below twin, else its text.
		for (const other of notationMarks(
			note,
			'articulations',
			'other-articulation',
		)) {
			const glyph = smuflGlyph(other.getAttribute('smufl'));
			if (glyph) {
				staveNote.addModifier(
					this.styleGraceArticulation(
						new NoteheadArticulation(
							mirroredPair(other.getAttribute('smufl') ?? '') ?? glyph,
						)
							.setSide(staveNote)
							.clearTie(tieSides),
						staveNote,
						isGrace,
					),
				);
				continue;
			}
			this.addTextMark(staveNote, other);
		}
	}

	/*
	 * Behind Bars p. 130 (grace-articulation-outside): grace-note articulations draw
	 * scaled down to the grace note's font scale and sit outside the stave so small marks
	 * stay conspicuous.
	 */
	private styleGraceArticulation(
		articulation: StaveArticulation,
		staveNote: StaveNote,
		isGrace: boolean,
	): StaveArticulation {
		if (!isGrace) {
			return articulation;
		}
		articulation.setBetweenLines(false);
		articulation.setFontSize(
			articulation.fontSizeInPoints * staveNote.getFontScale(),
		);
		return articulation;
	}

	/* Which sides of `chord` carry a tie that a notehead-side articulation must clear. */
	private tieClearanceOf(chord: Chord): TieClearance {
		let above = false;
		let below = false;
		let notehead = false;
		const heads = chord.notes.length;
		const middle = (heads - 1) / 2;
		chord.notes.forEach((member, index) => {
			for (const tie of this.reader.tiesOf(member)) {
				const orientation = tie.getAttribute('orientation');
				if (orientation === 'over') {
					above = true;
				} else if (orientation === 'under') {
					below = true;
				} else if (heads === 1 || index === middle) {
					notehead = true;
				} else if (index > middle) {
					above = true;
				} else {
					below = true;
				}
			}
		});
		if (above && below) {
			return 'both';
		}
		if (notehead) {
			return above || below ? 'both' : 'notehead';
		}
		if (above) {
			return 'above';
		}
		return below ? 'below' : 'none';
	}

	/* Which sides of `chord` carry a slur endpoint that an accent must sit outside. */
	private slurClearanceOf(chord: Chord): TieClearance {
		if (chord.lead.isGrace) {
			return 'none';
		}
		let above = false;
		let below = false;
		let notehead = false;
		for (const member of chord.notes) {
			for (const slur of member.slurs) {
				if (slur.slurType !== 'start' && slur.slurType !== 'stop') {
					continue;
				}
				// A stop marker rarely repeats placement or orientation; read them from its start.
				const source =
					slur.placement || slur.orientation || slur.slurType === 'start'
						? slur
						: (slur.partner ?? slur);
				const placement = source.placement;
				const orientation = source.orientation;
				if (placement === 'above' || orientation === 'over') {
					above = true;
				} else if (placement === 'below' || orientation === 'under') {
					below = true;
				} else {
					notehead = true;
				}
			}
		}
		if (above && below) {
			return 'both';
		}
		if (notehead) {
			return above || below ? 'both' : 'notehead';
		}
		if (above) {
			return 'above';
		}
		return below ? 'below' : 'none';
	}

	/*
	 * A free-text mark with no glyph to draw (an <other-*> with no smufl attribute, or one
	 * the font lacks): its text, set like a fingering on its placement side of the note.
	 */
	private addTextMark(staveNote: StaveNote, mark: MElement): void {
		const text = mark.text?.trim();
		if (text) {
			staveNote.addModifier(
				new FingeringAnnotation(
					text,
					mark.getAttribute('placement') === 'below',
				),
				0,
			);
		}
	}

	/*
	 * A note's <notations><other-notation>: a mark outside every other notations element,
	 * drawn as its smufl glyph above the note (below for placement="below"), else its text.
	 * A start/stop pair names a span; only its start draws, the sign marking where it begins.
	 */
	private addOtherNotations(staveNote: StaveNote, note: Note): void {
		const marks = note
			.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('other-notation'));
		for (const mark of marks) {
			if (mark.getAttribute('type') === 'stop') {
				continue;
			}
			const glyph = smuflGlyph(mark.getAttribute('smufl'));
			if (!glyph) {
				this.addTextMark(staveNote, mark);
				continue;
			}
			staveNote.addModifier(
				new StaveArticulation(glyph).setPosition(
					mark.getAttribute('placement') === 'below'
						? Modifier.Position.BELOW
						: Modifier.Position.ABOVE,
				),
			);
		}
	}

	/*
	 * The ornament glyphs above a notehead: trills, turns, mordents, the schleifer, and the
	 * slashes of a single-note <tremolo>.
	 *
	 * An <accidental-mark> is not an ornament of its own: it is the small sharp/flat drawn with
	 * the ornament it follows (an F# turn), so it attaches to the last one built. An explicit
	 * placement wins (above or below); with none, a mordent's lower-neighbour mark sits below
	 * the sign and every other ornament's first mark sits above (Behind Bars p. 84), with a
	 * second mark taking the remaining slot.
	 * ponytail: <wavy-line> is left to the tab path (it becomes a Vibrato there). On a notation
	 * stave a trill's extension line needs a start..stop spanner like buildWedges; add one when
	 * a fixture needs the line rather than the "tr" alone.
	 */
	private addOrnaments(staveNote: StaveNote, chord: Chord): void {
		// Ornaments are read from every chord member so a double trill on a single-stemmed
		// chord renders two distinct `tr` signs (Behind Bars p. 135). Single-note tremolo
		// slashes belong to the chord's shared stem, so they are read from the lead only.
		for (const note of chord.notes) {
			let last: Ornament | undefined;
			let lastType: MOrnament['ornamentType'] | undefined;
			let hasUpper = false;
			let hasLower = false;
			for (const ornament of this.reader.ornamentsOf(note)) {
				if (ornament.ornamentType === 'accidental-mark') {
					if (last) {
						const code = ACCIDENTAL_CODES[ornament.accidentalMark ?? ''];
						if (code) {
							const preferredBelow =
								ornament.placement === 'below' ||
								(ornament.placement === null && lastType === 'mordent');
							const below = preferredBelow ? !hasLower : hasUpper;
							if (below) {
								last.setLowerAccidental(code);
								hasLower = true;
							} else {
								last.setUpperAccidental(code);
								hasUpper = true;
							}
						}
					} else {
						this.addStandaloneAccidentalMark(staveNote, ornament);
					}
					continue;
				}
				if (ornament.ornamentType === 'tremolo') {
					// <tremolo type="single">N</tremolo>: N slashes through the stem. The
					// start/stop pair draws between its notes instead (SpannerBuilder.buildTremolos).
					if (
						note !== chord.lead ||
						ornament.tremoloType === 'start' ||
						ornament.tremoloType === 'stop'
					) {
						continue;
					}
					const marks = ornament.tremoloMarks || 1;
					staveNote.addModifier(new StaveTremolo(marks));
					if (note.beams.length === 0) {
						StaveTremolo.extendStem(staveNote, marks);
					}
					continue;
				}
				if (
					ornament.ornamentType === 'other-ornament' &&
					!smuflGlyph(ornament.getAttribute('smufl'))
				) {
					this.addTextMark(staveNote, ornament);
					continue;
				}
				const type = ornamentGlyph(ornament);
				if (!type) {
					continue;
				}
				const placement =
					ornament.placement === 'above' || ornament.placement === 'below'
						? ornament.placement
						: null;
				last = new StaveOrnament(type, placement);
				lastType = ornament.ornamentType;
				hasUpper = false;
				hasLower = false;
				if (ornament.ornamentType.startsWith('delayed-')) {
					last.setDelayed(true);
				}
				staveNote.addModifier(last);
			}
		}
	}

	/*
	 * Standalone <notations><accidental-mark> elements (not inside <ornaments>): cautionary or
	 * editorial accidentals placed small above (or below when placement="below") their note
	 * (Behind Bars p. 83).
	 */
	private addAccidentalMarks(staveNote: StaveNote, note: Note): void {
		for (const mark of this.reader.accidentalMarksOf(note)) {
			this.addStandaloneAccidentalMark(staveNote, mark);
		}
	}

	private addStandaloneAccidentalMark(
		staveNote: StaveNote,
		mark: MElement,
	): void {
		const value = mark.text?.trim() ?? '';
		const code =
			value === 'other'
				? smuflGlyph(mark.getAttribute('smufl'))
				: ACCIDENTAL_CODES[value];
		if (!code) {
			return;
		}
		const ornament = new Ornament(new Accidental(code).getText());
		ornament.setFontSize(Metrics.get('Accidental.grace.fontSize'));
		if (mark.getAttribute('placement') === 'below') {
			ornament.setPosition(Modifier.Position.BELOW);
		}
		staveNote.addModifier(ornament);
	}

	/*
	 * The digits/letters one note's <fingering> and <pluck> elements print, joined into a single
	 * label. A note usually carries one, but an editor offering a choice of hand positions writes
	 * several: MusicXML marks a substitution (change fingers while the key is held) with
	 * substitution="yes" and a second option with alternate="yes", which engrave as "5-3" and
	 * "(2)" respectively. Empty elements (an exporter's placeholder) contribute nothing.
	 */
	private fingeringLabel(marks: Technical[]): string {
		let label = '';
		for (const mark of marks) {
			const text = mark.text?.trim();
			if (!text) {
				continue;
			}
			if (mark.alternate) {
				label += `(${text})`;
			} else if (label && mark.substitution) {
				label += `-${text}`;
			} else {
				label += label ? ` ${text}` : text;
			}
		}
		return label;
	}

	/*
	 * A note's <notations><technical> marks on a NOTATION stave (the tab side lives in
	 * addTabModifiers): the bowing/tonguing/pizzicato glyphs, the <fingering>/<pluck> labels
	 * (a <tap> spelled out as text, "T" or "+", prints with them), and the <string> indicator.
	 *
	 * Fingerings are per chord MEMBER, so they read off the chord rather than its lead, and they
	 * stack outward from the notes: the digit nearest the stave belongs to the chord member
	 * nearest it. vexflow stacks a note's annotations in the order they're added, so an ABOVE
	 * column is added bottom-member first and a BELOW column top-member first.
	 *
	 * String numbers are added after the fingerings so the circled number sits OUTSIDE the digit
	 * it shares a note with, whichever order the two came in the file.
	 * ponytail: <string> draws as vexflow's circled Arabic numeral (the guitar convention).
	 * Bowed-string parts conventionally take Roman numerals instead (OSMD picks those), which
	 * needs its own glyph and a way to know the instrument family. Add it if a fixture asks.
	 */
	private addTechnicals(staveNote: StaveNote, chord: Chord): void {
		const lowerOnlyCircle = this.isLowerOnlyChordCircle(staveNote, chord);
		const strings: {
			index: number;
			number: string;
			below: boolean;
			explicitPlacement: boolean;
		}[] = [];
		const fingerings: { index: number; text: string; below: boolean }[] = [];
		const plucks: { index: number; text: string; below: boolean }[] = [];
		chord.notes.forEach((note, index) => {
			const fingeringMarks: Technical[] = [];
			const pluckMarks: Technical[] = [];
			let fingeringPlacement: 'above' | 'below' | null = null;
			let pluckPlacement: 'above' | 'below' | null = null;
			for (const mark of this.reader.technicalsOf(note)) {
				const explicitPlacement =
					mark.placement === 'above' || mark.placement === 'below';
				if (
					mark.technicalType === 'fingering' ||
					(mark.technicalType === 'tap' && mark.text?.trim())
				) {
					if (explicitPlacement) {
						fingeringPlacement = mark.placement;
					}
					fingeringMarks.push(mark);
					continue;
				}
				if (mark.technicalType === 'pluck') {
					if (explicitPlacement) {
						pluckPlacement = mark.placement;
					}
					pluckMarks.push(mark);
					continue;
				}
				if (mark.technicalType === 'string') {
					const number = mark.text?.trim();
					if (number) {
						// Behind Bars p. 373 (guitar-string-circled-position): on guitar / plucked
						// string parts, unplaced single-note circled string numbers sit on whichever
						// side of the stave is closest to the note (below for notes below the middle
						// line, above for middle-line and higher notes). Bowed strings (p. 394) and
						// multi-note chord stacks (p. 374) keep their default above the stave.
						const line = staveNote.getKeyProps()[index]?.line;
						const below =
							mark.placement === 'below' ||
							(!explicitPlacement &&
								chord.notes.length === 1 &&
								line !== undefined &&
								line < 3 &&
								this.reader.isPluckedStringPart(note.measure.part));
						strings.push({
							index,
							number,
							below,
							explicitPlacement,
						});
					}
					continue;
				}
				const code = technicalCode(mark);
				if (code) {
					// Behind Bars pp. 397, 414 (string-double-stop-one-open,
					// string-harmonic-lower-chord-below): on a single-stemmed chord where only
					// the lowest note carries an unplaced open-string or sounding-pitch harmonic
					// circle, place the circle below the stave.
					const defaultBelow =
						!explicitPlacement && code === 'ah' && lowerOnlyCircle;
					const articulation = new StaveArticulation(code).setPosition(
						mark.placement === 'below' || defaultBelow
							? Modifier.Position.BELOW
							: Modifier.Position.ABOVE,
					);
					if (
						mark.technicalType === 'open-string' ||
						mark.technicalType === 'stopped' ||
						mark.technicalType === 'up-bow' ||
						mark.technicalType === 'down-bow'
					) {
						articulation.markLowerVoiceBelow(explicitPlacement);
					}
					if (mark.technicalType === 'open-string') {
						// Behind Bars p. 397 (string-double-stop-adjacent-open): align an open-string
						// circle horizontally with its owning notehead when displaced in a second.
						articulation.markAlignToNotehead();
					}
					if (
						mark.technicalType === 'up-bow' ||
						mark.technicalType === 'down-bow'
					) {
						// SMuFL stringsUpBowTurned / stringsDownBowTurned for the lower voice below.
						articulation.markBowing(
							mark.technicalType === 'up-bow' ? '\uE613' : '\uE611',
						);
					}
					staveNote.addModifier(articulation, index);
				}
			}
			// <open> is not one of mdom's technicals, so it is read off the element.
			for (const open of notationMarks(note, 'technical', 'open')) {
				staveNote.addModifier(
					new StaveArticulation(
						smuflGlyph(open.getAttribute('smufl')) ?? '\uE5E7', // brassMuteOpen
					).setPosition(
						open.getAttribute('placement') === 'below'
							? Modifier.Position.BELOW
							: Modifier.Position.ABOVE,
					),
					index,
				);
			}
			const fingeringText = this.fingeringLabel(fingeringMarks);
			if (fingeringText) {
				// Behind Bars p. 309 (kbd-fingering-side-default): on a two-stave keyboard
				// grand staff, unplaced lower-stave fingerings default below the bass stave.
				const hasFingering = fingeringMarks.some(
					(mark) => mark.technicalType === 'fingering',
				);
				const below =
					fingeringPlacement === 'below' ||
					(fingeringPlacement === null &&
						hasFingering &&
						this.reader.isLowerGrandStaff(note));
				fingerings.push({ index, text: fingeringText, below });
			}
			const pluckText = this.fingeringLabel(pluckMarks);
			if (pluckText) {
				plucks.push({
					index,
					text: pluckText,
					below: pluckPlacement === 'below',
				});
			}
		});
		// Bottom-member first going up, top-member first going down; see the note above.
		// Left-hand fingerings sit closest to the notehead, right-hand <pluck> letters
		// outside them in italic, and circled <string> numbers outermost (Behind Bars pp. 374–375).
		for (const [tier, italic] of [
			[fingerings, false],
			[plucks, true],
		] as const) {
			for (const side of [false, true]) {
				const column = tier.filter((f) => f.below === side);
				if (side) {
					column.reverse();
				}
				for (const { index, text } of column) {
					staveNote.addModifier(
						new FingeringAnnotation(text, side, { italic }),
						index,
					);
				}
			}
		}
		for (const { index, number, below, explicitPlacement } of strings) {
			staveNote.addModifier(
				new StringNumberAnnotation(number, below, explicitPlacement),
				index,
			);
		}
	}

	/*
	 * Whether a multi-note chord has open-string or sounding-pitch harmonic circles attached
	 * exclusively to its lowest pitched notehead (not to any higher notehead).
	 */
	private isLowerOnlyChordCircle(staveNote: StaveNote, chord: Chord): boolean {
		if (chord.notes.length < 2) {
			return false;
		}
		const keyProps = staveNote.getKeyProps();
		if (keyProps.length !== chord.notes.length) {
			return false;
		}
		const lines = keyProps.map((k) => k.line);
		const minLine = Math.min(...lines);
		const maxLine = Math.max(...lines);
		if (minLine >= maxLine) {
			return false;
		}
		let hasLowerCircle = false;
		for (let i = 0; i < chord.notes.length; i++) {
			const note = chord.notes[i];
			const line = lines[i];
			if (!note || line === undefined) {
				continue;
			}
			const hasCircle = this.reader
				.technicalsOf(note)
				.some((mark) => technicalCode(mark) === 'ah');
			if (!hasCircle) {
				continue;
			}
			if (line > minLine) {
				return false;
			}
			hasLowerCircle = true;
		}
		return hasLowerCircle;
	}

	/*
	 * A <notations><fermata>: the held-note arc-over-dot. Default placement is above
	 * (vexflow "a@a"); type="inverted" mirrors it below ("a@u"). Unlike articulations,
	 * the side is the fermata's type, not the stem direction. The element's text is its
	 * shape, which mdom does not surface, so it is read off the element itself; a shape
	 * other than normal draws its own SMuFL glyph through the same Articulation.
	 */
	private addFermata(staveNote: StaveNote, note: Note): void {
		const fermata = note.fermata;
		if (!fermata) {
			return;
		}
		const inverted = fermata === 'inverted';
		const fermataElement = note
			.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('fermata'))[0];
		const rawType = fermataElement?.getAttribute('type');
		const explicitType = rawType === 'upright' || rawType === 'inverted';
		const shape = fermataElement?.text?.trim();
		const faces = FERMATA_SHAPES[shape ?? ''] ?? NORMAL_FERMATA;
		const belowGlyph = (FERMATA_GLYPHS[shape ?? ''] ??
			NORMAL_FERMATA_GLYPHS)[1];
		const articulation = new StaveArticulation(
			faces[inverted ? 1 : 0],
		).markFermata({ belowGlyph, explicitType });
		// Vexflow defaults every Articulation to ABOVE; the below-shaped glyph also needs the
		// BELOW position so it sits under the note instead of floating over it.
		articulation.setPosition(
			inverted ? Modifier.Position.BELOW : Modifier.Position.ABOVE,
		);
		staveNote.addModifier(articulation);
	}

	/*
	 * A <notations><arpeggiate>: the wavy vertical line rolled down the left of a chord.
	 * Drawn as a vexflow Stroke spanning every notehead (it reads the note's full y-range,
	 * so attaching at index 0 covers the whole chord). MusicXML's direction is the arrow's
	 * heading; vexflow names its roll types by the opposite end, so "up" (arrowhead up, at
	 * the top) is ROLL_DOWN and "down" (arrowhead down, at the bottom) is ROLL_UP. An
	 * undirected arpeggiate is a plain wiggle with no arrow (ARPEGGIO_DIRECTIONLESS).
	 */
	private addArpeggio(staveNote: StaveNote, note: Note): void {
		const arpeggiate = note.arpeggiate;
		if (!arpeggiate) {
			return;
		}
		const direction = arpeggiate.direction;
		let type = Stroke.Type.ARPEGGIO_DIRECTIONLESS;
		if (direction === 'up') {
			type = Stroke.Type.ROLL_DOWN;
		} else if (direction === 'down') {
			type = Stroke.Type.ROLL_UP;
		}
		// unbroken="yes" is raw-only in mdom; DrawPass joins the staves' strokes once built.
		const unbroken =
			note.child('notations')?.child('arpeggiate')?.getAttribute('unbroken') ===
			'yes';
		staveNote.addModifier(
			unbroken ? new UnbrokenArpeggio(type) : new Stroke(type),
			0,
		);
	}

	/*
	 * A <notations><non-arpeggiate>: the bracket marking a chord to be struck together, the
	 * explicit opposite of the arpeggio wiggle. MusicXML puts type="bottom" on the lowest
	 * member it covers and type="top" on the highest, and the members between carry nothing,
	 * so the range comes from the whole chord, not just the lead. A half-marked chord (only one
	 * end present, which lilypond_32d's malformed neighbors produce) brackets from the end it
	 * does name out to the edge of the chord rather than dropping the mark.
	 */
	private addNonArpeggiate(staveNote: StaveNote, chord: Chord): void {
		const types = chord.notes.map((note) => note.nonArpeggiate);
		const bottom = types.indexOf('bottom');
		const top = types.lastIndexOf('top');
		if (bottom < 0 && top < 0) {
			return;
		}
		let end: 'top' | 'bottom' | 'both' = 'both';
		if (bottom < 0) {
			end = 'top';
		} else if (top < 0) {
			end = 'bottom';
		}
		const markNote = chord.notes[top >= 0 ? top : bottom];
		const number = markNote?.nonArpeggiateNumber ?? 1;
		staveNote.addModifier(
			new NonArpeggioBracket(
				bottom < 0 ? 0 : bottom,
				top < 0 ? chord.notes.length - 1 : top,
				end,
				number,
			),
			0,
		);
	}

	/*
	 * Attach a note's <lyric> verses as text under the stave, one annotation per verse in
	 * verse order (verse 1 nearest the stave).
	 *
	 * Hyphens for 'begin'/'middle' syllables and continuations ('middle'/'end') are drawn by
	 * LyricPlacer.drawSystemHyphens centred between syllables (and before/after extended
	 * rests or system breaks) rather than appended to the syllable text. The melisma
	 * <extend/> flag is passed through for LyricPlacer.pin to draw.
	 */
	private addLyrics(staveNote: StaveNote, lead: Note): void {
		const verses = [...this.reader.lyricsOf(lead)].sort(
			(a, b) => Number(a.verse) - Number(b.verse),
		);
		const lyricFont = lead.measure.part.score
			.child('defaults')
			?.child('lyric-font');
		verses.forEach((verse, index) => {
			const scale = fontScaleOf(
				verse.child('text')?.getAttribute('font-size') ?? null,
				lyricFont?.getAttribute('font-size') ?? null,
			);
			const syllabic = verse.syllabic;
			const hyphenated = syllabic === 'begin' || syllabic === 'middle';
			const continues = syllabic === 'middle' || syllabic === 'end';
			const text = this.syllableOf(verse) || this.soundOf(verse);
			if (text) {
				staveNote.addModifier(
					new LyricAnnotation(text, index, verse.extend, {
						family: this.lyricFaceOf(verse),
						justify: this.justifyOf(verse),
						scale,
						hyphenated,
						continues,
						documentPosition: this.reader.positionOf(verse),
					}),
				);
			}
		});
	}

	/* `<lyric justify>`: which edge of the note the syllable lines up with; anything else is centered. */
	private justifyOf(verse: Lyric): LyricJustify {
		const justify = verse.getAttribute('justify');
		return justify === 'left' || justify === 'right' ? justify : 'center';
	}

	/*
	 * The face a verse is typed in under NotationTranslatorOptions.documentFonts: its first
	 * <text>'s font-family, else the score's lyric-font for its number or name, else the one
	 * that names neither; over the text font. Undefined leaves the annotation's own face.
	 */
	private lyricFaceOf(verse: Lyric): string | undefined {
		const { documentFonts } = this.opts;
		if (!documentFonts) {
			return undefined;
		}
		const fonts = this.lyricFontsOf(verse);
		const number = verse.getAttribute('number');
		const name = verse.getAttribute('name');
		const font =
			fonts.find(
				(f) =>
					(number !== null && f.getAttribute('number') === number) ||
					(name !== null && f.getAttribute('name') === name),
			) ??
			fonts.find(
				(f) =>
					f.getAttribute('number') === null && f.getAttribute('name') === null,
			);
		const family =
			verse.child('text')?.getAttribute('font-family') ??
			font?.getAttribute('font-family') ??
			null;
		return FontFamilies.documentStack(family, documentFonts.textFont);
	}

	private lyricFontsOf(verse: Lyric): MElement[] {
		const score = verse.closest(Score);
		if (!score) {
			return [];
		}
		let fonts = this.lyricFonts.get(score);
		if (!fonts) {
			fonts = score.child('defaults')?.childrenNamed('lyric-font') ?? [];
			this.lyricFonts.set(score, fonts);
		}
		return fonts;
	}

	/*
	 * What a text-less lyric sings: <humming/> is "mm" and <laughing/> is "ha ha", the way
	 * a vocal score spells them under the notes. <end-line/> and <end-paragraph/> mark where
	 * a printed lyric breaks its line or paragraph, which a verse hung on one baseline per
	 * system has no use for, so they draw nothing.
	 */
	private soundOf(verse: Lyric): string {
		if (verse.child('humming')) {
			return 'mm';
		}
		return verse.child('laughing') ? 'ha ha' : '';
	}

	/*
	 * A lyric's text with its <elision> separators kept. Lyric.syllable joins the <text> runs
	 * with nothing between them, so an elided two-syllable lyric comes out "de" rather than
	 * "d e". An empty <elision/> leaves the symbol to the renderer; a space is the conventional
	 * pick and makes it read the same as the equivalent "d e" single-<text> spelling. An elision
	 * carrying its own text (an undertie, an underscore) uses that instead.
	 */
	private syllableOf(verse: Lyric): string {
		// U+00A0, not a plain space: it must not be a line-break opportunity or collapse.
		return verse.runs
			.map((run) => run.text || (run.kind === 'elision' ? ' ' : ''))
			.join('');
	}
}

/*
 * MusicXML <articulations> name -> the notehead-side mark it draws: a vexflow articulation
 * code, or an [above, below] pair of raw SMuFL glyphs when we need a specific glyph
 * (Articulation passes an unrecognized code through as the glyph, the same way Accidental
 * does). vexflow's own codes carry both faces already, so they need no pair.
 */
const ARTICULATION_CODES: Record<
	string,
	string | [above: string, below: string]
> = {
	staccato: ['\uE4A2', '\uE4A3'], // articStaccatoAbove/Below
	accent: 'a>',
	tenuto: 'a-',
	staccatissimo: 'av',
	'detached-legato': ['\uE4B2', '\uE4B3'], // articTenutoStaccatoAbove/Below
	spiccato: ['\uE4A8', '\uE4A9'], // articStaccatissimoWedgeAbove/Below
	'soft-accent': ['\uED40', '\uED41'], // articSoftAccentAbove/Below
	stress: ['\uE4B6', '\uE4B7'], // articStressAbove/Below
	unstress: ['\uE4B8', '\uE4B9'], // articUnstressAbove/Below
};

/*
 * A note's fermata faces by shape: the SMuFL glyphs, except normal (which an empty element
 * means too) keeps vexflow's own codes, which carry its articulation metrics.
 */
const NORMAL_FERMATA: [above: string, below: string] = ['a@a', 'a@u'];
const FERMATA_SHAPES: Record<string, [above: string, below: string]> = {
	...FERMATA_GLYPHS,
	normal: NORMAL_FERMATA,
};

/*
 * The jazz brush strokes: a stroke off the side of the notehead rather than a mark above or
 * below it. vexflow models these as Ornaments and takes the side from the ornament's name:
 * scoop and plop lead INTO the note (drawn left), doit and falloff off it (drawn right), so
 * plop borrows scoop's name for the placement and swaps in its own SMuFL glyph.
 */
const BRUSH_ORNAMENTS: Record<string, { type: string; glyph?: string }> = {
	scoop: { type: 'scoop' },
	plop: { type: 'scoop', glyph: '\uE5E0' }, // brassPlop
	doit: { type: 'doit' },
	falloff: { type: 'fall' },
};

/*
 * MusicXML <ornaments> child tag -> the vexflow Ornament type that draws it. Names vexflow
 * knows are used as-is; the rest hand it their SMuFL glyph, which Tables.ornamentCodes
 * passes through verbatim (the same escape hatch accidentals and articulations use).
 *
 * The two mordents read backwards on purpose. MusicXML's <mordent> is the sign WITH the
 * vertical stroke and <inverted-mordent> the one without it; vexflow names the stroked one
 * 'mordentInverted' and the plain one 'mordent'.
 *
 * A delayed turn draws the same glyph as its plain form, moved to sit between its note and
 * the next one: vexflow's own setDelayed does that, so the pair shares an entry here.
 */
const ORNAMENT_TYPES: Record<string, string> = {
	'trill-mark': 'tr',
	turn: 'turn',
	'delayed-turn': 'turn',
	'inverted-turn': '\uE568', // ornamentTurnInverted (vexflow's 'turnInverted' is the slashed one)
	'delayed-inverted-turn': '\uE568',
	shake: 'prallprall', // ornamentTremblement: the long trill wiggle
	mordent: 'mordentInverted',
	'inverted-mordent': 'mordent',
	schleifer: '\uE587', // ornamentSchleifer
	haydn: '\uE56F', // ornamentHaydn
	'vertical-turn': '\uE56A', // ornamentTurnUp
	'inverted-vertical-turn': '\uE56B', // ornamentTurnUpS
};

/*
 * A long mordent (long="yes"), keyed by its tag, approach and departure: SMuFL's precomposed
 * glyph for each compound form it has one for. approach/departure say which side the hook
 * that leads in or trails off comes from; MuseScore reads the attributes the same way. A
 * compound form SMuFL has no glyph for is composed from its ornament strokes (see
 * composedMordent). SMuFL's precomposed names flip the stroke: its "inverted mordent with
 * upper prefix" is the one drawn WITH it, so that is the stroked <mordent>'s.
 */
const LONG_MORDENTS: Record<string, string> = {
	'mordent  ': '\uE5BD', // ornamentPrecompTrillWithMordent
	'mordent above ': '\uE5C7', // ornamentPrecompInvertedMordentUpperPrefix
	'inverted-mordent  ': 'prallprall', // ornamentTremblement, as <shake>
	'inverted-mordent above ': '\uE5C6', // ornamentPrecompMordentUpperPrefix
	'inverted-mordent  below': '\uE5C8', // ornamentPrecompTrillLowerSuffix
};

/*
 * The SMuFL ornament strokes a long mordent is built from, each set beside the last at its
 * advance: the hook leading in from above or below, the zigzag, the vertical stroke that
 * marks <mordent>, and the zigzag's end, plain or hooked up or down. Every precomposed glyph
 * in LONG_MORDENTS is these strokes joined, so a composed form matches them.
 */
const MORDENT_APPROACHES: Record<string, string> = {
	'': '',
	above: '\uE591', // ornamentTopLeftConvexStroke
	below: '\uE59A', // ornamentBottomLeftConcaveStroke
};
const MORDENT_ZIGZAG = '\uE59D\uE59D'; // ornamentZigZagLineNoRightEnd, twice
const MORDENT_STROKE = '\uE59F'; // ornamentMiddleVerticalStroke
const MORDENT_DEPARTURES: Record<string, string> = {
	'': '\uE59E', // ornamentZigZagLineWithRightEnd
	above: '\uE5A1', // ornamentTopRightConvexStroke
	below: '\uE5A7', // ornamentBottomRightConcaveStroke
};

/* A long mordent SMuFL has no precomposed glyph for, joined from its strokes. */
function composedMordent(
	type: 'mordent' | 'inverted-mordent',
	approach: string,
	departure: string,
): string {
	return (
		(MORDENT_APPROACHES[approach] ?? '') +
		MORDENT_ZIGZAG +
		(type === 'mordent' ? MORDENT_STROKE : '') +
		(MORDENT_DEPARTURES[departure] ?? MORDENT_DEPARTURES[''])
	);
}

/*
 * slash="yes" on a turn adds the vertical stroke. SMuFL has one stroked turn
 * (ornamentTurnSlash) and no separate stroked inverted form, so all four turns share it.
 * <mordent> has no slash attribute in MusicXML 4.0.
 */
const SLASHED_TURNS = new Set([
	'turn',
	'delayed-turn',
	'inverted-turn',
	'delayed-inverted-turn',
]);
const SLASHED_TURN = '\uE569';

/*
 * MusicXML <notations><technical> mark -> the glyph it draws on a NOTATION stave: a vexflow
 * articulation code where one exists, else the raw SMuFL glyph (Articulation passes an
 * unrecognized code straight through, the same escape hatch accidentals and ornaments use).
 *
 * <harmonic> is absent: the touching pitch is engraved as a diamond notehead (see
 * isDiamondHarmonic, pinned by harmonic.musicxml), so drawing the "o" as well would mark it
 * twice. technicalCode adds the "o" only for a sounding pitch, which keeps a normal head.
 * The tab-only members of <technical> (<bend>, <other-technical>, <string>/<fret>) belong
 * to TabVoiceTranslator; the two that carry text (<fingering>, <pluck>) and
 * <string> on a notation stave are handled by {@link addTechnicals} instead.
 */
const TECHNICAL_CODES: Record<string, string> = {
	'up-bow': 'a|',
	'down-bow': 'am',
	'open-string': 'ah', // stringsHarmonic: the small open circle
	'snap-pizzicato': 'ao',
	stopped: 'a+', // pluckedLeftHandPizzicato: the "+" of a stopped horn / left-hand pizz
	'thumb-position': '\uE624', // stringsThumbPosition
	'double-tongue': '\uE5F0', // doubleTongueAbove
	'triple-tongue': '\uE5F2', // tripleTongueAbove
	heel: '\uE661', // keyboardPedalHeel1: the organ pedal's "U"
	toe: '\uE664', // keyboardPedalToe1: the organ pedal's "^"
	fingernails: '\uE636', // pluckedWithFingernails
	'brass-bend': '\uE5E3', // brassBend
	flip: '\uE5E1', // brassFlip
	'half-muted': '\uE5E6', // brassMuteHalfClosed
	golpe: '\uE842', // guitarGolpe
	smear: '\uE5E2', // brassSmear
};

/*
 * <handbell> text -> its SMuFL handbells glyph. "damp" takes handbellsDamp3, the one damp
 * glyph that reads on its own; the other two are the halves of a two-note damp.
 */
const HANDBELL_CODES: Record<string, string> = {
	belltree: '\uE81F', // handbellsBelltree
	damp: '\uE81E', // handbellsDamp3
	echo: '\uE81B', // handbellsEcho1
	gyro: '\uE81D', // handbellsGyro
	'hand martellato': '\uE812', // handbellsHandMartellato
	'mallet lift': '\uE816', // handbellsMalletLft
	'mallet table': '\uE815', // handbellsMalletBellOnTable
	martellato: '\uE810', // handbellsMartellato
	'martellato lift': '\uE811', // handbellsMartellatoLift
	'muted martellato': '\uE813', // handbellsMutedMartellato
	'pluck lift': '\uE817', // handbellsPluckLift
	swing: '\uE81A', // handbellsSwing
};

/*
 * <arrow-direction> -> its offset within a SMuFL arrow block, which runs clockwise from up:
 * arrowBlackUp is U+EB60, arrowBlackUpRight U+EB61, and so on to arrowBlackUpLeft U+EB67.
 * ponytail: the two-headed directions ("left right", "up down", ...) have no SMuFL glyph and
 * draw nothing, as does <circular-arrow>.
 */
const ARROW_DIRECTIONS: Record<string, number> = {
	up: 0,
	northeast: 1,
	right: 2,
	southeast: 3,
	down: 4,
	southwest: 5,
	left: 6,
	northwest: 7,
};

/*
 * The glyph a <technical> mark draws, or undefined when it draws none. Most marks are
 * fixed glyphs in TECHNICAL_CODES; <hole>, <harmon-mute>, <arrow> and <handbell> choose
 * theirs from what they contain.
 */
function technicalCode(mark: Technical): string | undefined {
	switch (mark.technicalType) {
		case 'hole':
			return holeCode(mark);
		case 'harmon-mute':
			return harmonMuteCode(mark);
		case 'arrow':
			return arrowCode(mark);
		case 'handbell':
			return HANDBELL_CODES[mark.text?.trim() ?? ''];
		case 'tap':
			// An empty <tap> takes its glyph from the hand (a text one prints as a label).
			return mark.getAttribute('hand') === 'left'
				? '\uE840' // guitarLeftHandTapping
				: '\uE841'; // guitarRightHandTapping
		case 'harmonic':
			// a diamond head already marks the touching pitch; a sounding-pitch or bare
			// <harmonic/> keeps a normal head, so the small circle above tells it from a plain note
			return harmonicPitchOf(mark) === 'sounding' ? 'ah' : undefined;
	}
	return TECHNICAL_CODES[mark.technicalType];
}

/*
 * A woodwind <hole>: its <hole-closed> picks the filled, empty or half-filled circle.
 * <hole-type> (a label like "thumb") and <hole-shape> are not drawn.
 */
function holeCode(mark: Technical): string | undefined {
	switch (mark.childrenNamed('hole-closed')[0]?.text?.trim()) {
		case 'yes':
			return '\uE5F4'; // windClosedHole
		case 'no':
			return '\uE5F9'; // windOpenHole
		case 'half':
			return '\uE5F6'; // windHalfClosedHole1
	}
	return undefined;
}

/*
 * A brass <harmon-mute>: its <harmon-closed> picks the closed "+", the open circle, or a
 * half-closed one filled on the side its location names (left unless it says right).
 */
function harmonMuteCode(mark: Technical): string | undefined {
	const closed = mark.childrenNamed('harmon-closed')[0];
	switch (closed?.text?.trim()) {
		case 'yes':
			return '\uE5E8'; // brassHarmonMuteClosed
		case 'no':
			return '\uE5EB'; // brassHarmonMuteStemOpen
		case 'half':
			return closed?.getAttribute('location') === 'right'
				? '\uE5EA' // brassHarmonMuteStemHalfRight
				: '\uE5E9'; // brassHarmonMuteStemHalfLeft
	}
	return undefined;
}

/*
 * An <arrow>: <arrow-direction> picks which way it points and <arrow-style> its block,
 * "single" (the default) the plain open arrow, "filled" the black one, "hollow" the white
 * one. <arrowhead/> draws the head alone. The doubled styles fall back to a single arrow.
 */
function arrowCode(mark: Technical): string | undefined {
	const direction =
		ARROW_DIRECTIONS[
			mark.childrenNamed('arrow-direction')[0]?.text?.trim() ?? ''
		];
	if (direction === undefined) {
		return undefined;
	}
	const style = mark.childrenNamed('arrow-style')[0]?.text?.trim();
	const head = mark.childrenNamed('arrowhead').length > 0;
	let base: number;
	if (style === 'filled') {
		base = head ? 0xeb78 : 0xeb60; // arrowheadBlackUp / arrowBlackUp
	} else if (style === 'hollow') {
		base = head ? 0xeb80 : 0xeb68; // arrowheadWhiteUp / arrowWhiteUp
	} else {
		base = head ? 0xeb88 : 0xeb70; // arrowheadOpenUp / arrowOpenUp
	}
	return String.fromCharCode(base + direction);
}

/*
 * The vexflow Ornament type an <ornaments> child draws, or undefined when it draws none: a
 * slashed turn's stroked glyph, a long or compound mordent's precomposed or composed one, an
 * <other-ornament>'s smufl glyph, else the tag's entry in ORNAMENT_TYPES.
 */
function ornamentGlyph(ornament: MOrnament): string | undefined {
	const type = ornament.ornamentType;
	if (type === 'other-ornament') {
		return smuflGlyph(ornament.getAttribute('smufl'));
	}
	if (ornament.getAttribute('slash') === 'yes' && SLASHED_TURNS.has(type)) {
		return SLASHED_TURN;
	}
	if (type === 'mordent' || type === 'inverted-mordent') {
		const approach = ornament.getAttribute('approach') ?? '';
		const departure = ornament.getAttribute('departure') ?? '';
		// A hook only exists on the long form, so either one implies it.
		if (ornament.getAttribute('long') === 'yes' || approach || departure) {
			return (
				LONG_MORDENTS[`${type} ${approach} ${departure}`] ??
				composedMordent(type, approach, departure)
			);
		}
	}
	return ORNAMENT_TYPES[type];
}

/* Every `<notations><group><tag>` element on a note, for the marks mdom does not type. */
function notationMarks(note: Note, group: string, tag: string): MElement[] {
	return note
		.childrenNamed('notations')
		.flatMap((notations) => notations.childrenNamed(group))
		.flatMap((block) => block.childrenNamed(tag));
}

/*
 * The [above, below] faces of a SMuFL articulation named for one side (articAccentAbove), when
 * the font has its twin, so the mark can flip to whichever side of the notehead it lands on.
 */
function mirroredPair(
	name: string,
): [above: string, below: string] | undefined {
	const match = /^(.*)(Above|Below)$/.exec(name);
	if (!match) {
		return undefined;
	}
	const above = smuflGlyph(`${match[1]}Above`);
	const below = smuflGlyph(`${match[1]}Below`);
	return above && below ? [above, below] : undefined;
}

export interface NotationTranslatorOptions {
	/** Type lyrics in the faces their document names (Config.documentFonts), over `textFont`,
	 * the configured text stack. Absent means vexml's own face. */
	documentFonts?: { textFont: string };
}
