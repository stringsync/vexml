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
	Modifier,
	Ornament,
	type StaveNote,
	Stroke,
	Tremolo,
} from 'vexflow/core';
import { ACCIDENTAL_CODES } from './chord-translator';
import { FERMATA_GLYPHS } from './fermata-glyphs';
import { FingeringAnnotation } from './fingering-annotation';
import { FontFamilies } from './font-families';
import { fontScaleOf } from './font-scale';
import { FootnoteAnnotation } from './footnote-annotation';
import { LyricAnnotation } from './lyric-annotation';
import type { LyricJustify } from './lyric-mark';
import { NonArpeggioBracket } from './non-arpeggio-bracket';
import { NoteheadArticulation } from './notehead-articulation';
import type { ScoreReader } from './score-reader';
import { smuflGlyph } from './smufl';
import { StaveArticulation } from './stave-articulation';
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
			this.addArticulations(staveNote, lead);
			this.addTechnicals(staveNote, chord);
			this.addOrnaments(staveNote, lead);
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

	private hidesNotations(note: Note): boolean {
		const groups = note.childrenNamed('notations');
		return (
			groups.length > 0 &&
			groups.every((group) => group.getAttribute('print-object') === 'no')
		);
	}

	private addArticulations(staveNote: StaveNote, note: Note): void {
		for (const name of note.articulations) {
			const brush = BRUSH_ORNAMENTS[name];
			if (brush) {
				const ornament = new Ornament(brush.type);
				if (brush.glyph) {
					ornament.setText(brush.glyph);
				}
				staveNote.addModifier(ornament);
				continue;
			}
			const measureMark = MEASURE_MARK_GLYPHS[name];
			if (measureMark) {
				staveNote.addModifier(
					new StaveArticulation(measureMark).setPosition(
						Modifier.Position.ABOVE,
					),
				);
				continue;
			}
			const code = ARTICULATION_CODES[name];
			if (code) {
				staveNote.addModifier(
					new NoteheadArticulation(code).setSide(staveNote),
				);
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
					new NoteheadArticulation(
						mirroredPair(other.getAttribute('smufl') ?? '') ?? glyph,
					).setSide(staveNote),
				);
				continue;
			}
			this.addTextMark(staveNote, other);
		}
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
	 * the ornament it follows (an F# turn), so it attaches to the last one built. MusicXML gives
	 * each a placement, but the pair on a turn conventionally reads one above and one below, so
	 * the first goes over the glyph and the second under it.
	 * ponytail: <wavy-line> is left to the tab path (it becomes a Vibrato there). On a notation
	 * stave a trill's extension line needs a start..stop spanner like buildWedges; add one when
	 * a fixture needs the line rather than the "tr" alone.
	 */
	private addOrnaments(staveNote: StaveNote, note: Note): void {
		let last: Ornament | undefined;
		let accidentalMarks = 0;
		for (const ornament of this.reader.ornamentsOf(note)) {
			if (ornament.ornamentType === 'accidental-mark') {
				const code = ACCIDENTAL_CODES[ornament.accidentalMark ?? ''];
				if (last && code) {
					if (accidentalMarks === 0) {
						last.setUpperAccidental(code);
					} else {
						last.setLowerAccidental(code);
					}
					accidentalMarks++;
				}
				continue;
			}
			if (ornament.ornamentType === 'tremolo') {
				// <tremolo type="single">N</tremolo>: N slashes through the stem. The
				// start/stop pair draws between its notes instead (SpannerBuilder.buildTremolos).
				if (
					ornament.tremoloType === 'start' ||
					ornament.tremoloType === 'stop'
				) {
					continue;
				}
				staveNote.addModifier(new Tremolo(ornament.tremoloMarks || 1));
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
			last = new Ornament(type);
			accidentalMarks = 0;
			if (ornament.ornamentType.startsWith('delayed-')) {
				last.setDelayed(true);
			}
			staveNote.addModifier(last);
		}
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
		const strings: { index: number; number: string; below: boolean }[] = [];
		const fingerings: { index: number; text: string; below: boolean }[] = [];
		chord.notes.forEach((note, index) => {
			const labels: Technical[] = [];
			let below = false;
			for (const mark of this.reader.technicalsOf(note)) {
				if (mark.placement === 'below') {
					below = true;
				}
				if (
					mark.technicalType === 'fingering' ||
					mark.technicalType === 'pluck' ||
					(mark.technicalType === 'tap' && mark.text?.trim())
				) {
					labels.push(mark);
					continue;
				}
				if (mark.technicalType === 'string') {
					const number = mark.text?.trim();
					if (number) {
						strings.push({ index, number, below: mark.placement === 'below' });
					}
					continue;
				}
				const code = technicalCode(mark);
				if (code) {
					staveNote.addModifier(
						new StaveArticulation(code).setPosition(
							mark.placement === 'below'
								? Modifier.Position.BELOW
								: Modifier.Position.ABOVE,
						),
						index,
					);
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
			const text = this.fingeringLabel(labels);
			if (text) {
				fingerings.push({ index, text, below });
			}
		});
		// Bottom-member first going up, top-member first going down; see the note above.
		for (const side of [false, true]) {
			const column = fingerings.filter((f) => f.below === side);
			if (side) {
				column.reverse();
			}
			for (const { index, text } of column) {
				staveNote.addModifier(new FingeringAnnotation(text, side), index);
			}
		}
		for (const { index, number, below } of strings) {
			staveNote.addModifier(new StringNumberAnnotation(number, below), index);
		}
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
		const shape = note
			.childrenNamed('notations')
			.flatMap((notations) => notations.childrenNamed('fermata'))[0]
			?.text?.trim();
		const faces = FERMATA_SHAPES[shape ?? ''] ?? NORMAL_FERMATA;
		const articulation = new StaveArticulation(faces[inverted ? 1 : 0]);
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
		staveNote.addModifier(
			new NonArpeggioBracket(
				bottom < 0 ? 0 : bottom,
				top < 0 ? chord.notes.length - 1 : top,
			),
			0,
		);
	}

	/*
	 * Attach a note's <lyric> verses as text under the stave, one annotation per verse in
	 * verse order (verse 1 nearest the stave).
	 *
	 * A syllable that opens or continues a word ('begin'/'middle') carries a trailing hyphen
	 * joining it to the next one: "Al-" "le-" "lu-" "ia".
	 * ponytail: the hyphen rides on the syllable instead of being drawn centered in the gap
	 * between the two: a centered hyphen needs a spanner across notes (and systems). A
	 * document's hyphen distance adds more across a wide gap (LyricPlacer). The
	 * melisma <extend/> flag is passed through for LyricPlacer.pin to draw.
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
			const text =
				(this.syllableOf(verse) || this.soundOf(verse)) +
				(hyphenated ? '-' : '');
			if (text) {
				staveNote.addModifier(
					new LyricAnnotation(text, index, verse.extend, {
						family: this.lyricFaceOf(verse),
						justify: this.justifyOf(verse),
						scale,
						hyphenated,
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
 * code, or an [above, below] pair of raw SMuFL glyphs for the marks vexflow has no code for
 * (Articulation passes an unrecognized code through as the glyph, the same way Accidental
 * does). vexflow's own codes carry both faces already, so they need no pair.
 */
const ARTICULATION_CODES: Record<
	string,
	string | [above: string, below: string]
> = {
	staccato: 'a.',
	accent: 'a>',
	tenuto: 'a-',
	staccatissimo: 'av',
	'strong-accent': 'a^',
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
 * Marks that name a moment in the bar rather than a way of playing the note. They sit
 * above the staff whichever way the stem points, so they're outside the notehead-side rule.
 */
const MEASURE_MARK_GLYPHS: Record<string, string> = {
	'breath-mark': '\uE4CE', // breathMarkComma
	caesura: '\uE4D1', // caesura
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
			// a diamond head already marks the touching pitch; a sounding-pitch harmonic keeps
			// a normal head, so the small circle above is what tells it from a plain note
			return mark.child('sounding-pitch') ? 'ah' : undefined;
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
