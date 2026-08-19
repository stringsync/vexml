import type { Chord, Lyric, Note, Technical } from '@stringsync/mdom';
import {
	Articulation,
	Modifier,
	Ornament,
	type StaveNote,
	Stem,
	Stroke,
	Tremolo,
} from 'vexflow';
import { ACCIDENTAL_CODES } from './chord-translator';
import { LyricAnnotation } from './lyric-annotation';
import {
	FingeringAnnotation,
	StringNumberAnnotation,
} from './technical-annotation';

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
	stress: ['\uE4B6', '\uE4B7'], // articStressAbove/Below
	unstress: ['\uE4B8', '\uE4B9'], // articUnstressAbove/Below
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
 * below it. vexflow models these as Ornaments and takes the side from the ornament's name —
 * scoop and plop lead INTO the note (drawn left), doit and falloff off it (drawn right) — so
 * plop borrows scoop's name for the placement and swaps in its own SMuFL glyph.
 */
const BRUSH_ORNAMENTS: Record<string, { type: string; glyph?: string }> = {
	scoop: { type: 'scoop' },
	plop: { type: 'scoop', glyph: '\uE5E0' }, // brassPlop
	doit: { type: 'doit' },
	falloff: { type: 'fall' },
};

/*
 * An articulation that clears the beam.
 *
 * vexflow parks a stem-side mark half a stave space off the STEM TIP, which on a beamed note
 * is exactly where the beam's ink starts — half a space of air reads as clearance over a thin
 * stem, but as a mark resting on the beam. Lift it another space when the note is beamed,
 * which is roughly what MuseScore engraves. The beam extends AWAY from the mark (down from a
 * stem-up tip), so its thickness costs nothing and the beam count doesn't matter.
 *
 * Applied by shifting the text line for the duration of the draw rather than at format time:
 * vexflow's Articulation.format has no view of the beam, and a note can be drawn more than
 * once (the spill pass), so a persistent bump would ratchet.
 */
class StaveArticulation extends Articulation {
	override draw(): void {
		const note = this.checkAttachedNote();
		const onStemTip =
			this.position ===
			(note.getStemDirection() === Stem.UP
				? Modifier.Position.ABOVE
				: Modifier.Position.BELOW);
		if (!note.hasBeam() || !onStemTip) {
			super.draw();
			return;
		}
		const line = this.textLine;
		this.setTextLine(line + 1);
		super.draw();
		this.setTextLine(line);
	}
}

/*
 * An articulation that sits opposite the stem — BELOW for a stem-up note, ABOVE otherwise.
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
 * the next one — vexflow's own setDelayed does that, so the pair shares an entry here.
 */
const ORNAMENT_TYPES: Record<string, string> = {
	'trill-mark': 'tr',
	turn: 'turn',
	'delayed-turn': 'turn',
	'inverted-turn': '\uE568', // ornamentTurnInverted (vexflow's 'turnInverted' is the slashed one)
	'delayed-inverted-turn': '\uE568',
	shake: 'prallprall', // ornamentTremblement — the long trill wiggle
	mordent: 'mordentInverted',
	'inverted-mordent': 'mordent',
	schleifer: '\uE587', // ornamentSchleifer
};

/*
 * MusicXML <notations><technical> mark -> the glyph it draws on a NOTATION stave: a vexflow
 * articulation code where one exists, else the raw SMuFL glyph (Articulation passes an
 * unrecognized code straight through, the same escape hatch accidentals and ornaments use).
 *
 * <harmonic> is deliberately absent: vexml already engraves it as a diamond notehead (see
 * isHarmonic, pinned by harmonic.musicxml), so drawing the "o" as well would mark it twice.
 * The tab-only members of <technical> — <bend>, <other-technical>, <string>/<fret> — belong
 * to TabTranslator; the two that carry text (<fingering>, <pluck>) and
 * <string> on a notation stave are handled by {@link addTechnicals} instead.
 */
const TECHNICAL_CODES: Record<string, string> = {
	'up-bow': 'a|',
	'down-bow': 'am',
	'open-string': 'ah', // stringsHarmonic — the small open circle
	'snap-pizzicato': 'ao',
	stopped: 'a+', // pluckedLeftHandPizzicato — the "+" of a stopped horn / left-hand pizz
	'thumb-position': '\uE624', // stringsThumbPosition
	'double-tongue': '\uE5F0', // doubleTongueAbove
	'triple-tongue': '\uE5F2', // tripleTongueAbove
};

/* Stroke width of the non-arpeggiate bracket's spine and hooks, in pixels. */
const NON_ARPEGGIATE_THICKNESS = 1.5;

/*
 * The square bracket of a <notations><non-arpeggiate>, drawn to the left of a chord: a
 * vertical spine with a hook at each end, both pointing right at the noteheads. vexflow's
 * Stroke has no bracket type, so this subclasses it purely to inherit the placement —
 * Stroke.format reserves the width and shifts the whole stack clear of accidentals, and it
 * dispatches on CATEGORY, which a subclass keeps — and replaces the wiggle in draw().
 */
class NonArpeggioBracket extends Stroke {
	constructor(
		private readonly lowIndex: number,
		private readonly highIndex: number,
	) {
		// The type is never read (draw is overridden), but Stroke's constructor needs one.
		super(Stroke.Type.ARPEGGIO_DIRECTIONLESS);
	}

	override draw(): void {
		const ctx = this.checkContext();
		const note = this.checkAttachedNote();
		this.setRendered();
		// Only the noteheads the mark actually spans: a non-arpeggiate whose type="bottom"
		// and type="top" name inner members brackets that part of the chord alone.
		const ys = note
			.getYs()
			.slice(this.lowIndex, this.highIndex + 1)
			.filter((y) => Number.isFinite(y));
		if (ys.length === 0) {
			return;
		}
		const lineSpace = note.checkStave().getSpacingBetweenLines();
		// Overhang the outer noteheads by half a staff space, the way the arpeggio wiggle
		// does, so the bracket reads as enclosing them rather than touching them.
		const top = Math.min(...ys) - lineSpace / 2;
		const bottom = Math.max(...ys) + lineSpace / 2;
		const x =
			note.getModifierStartXY(this.position, this.index).x - 5 + this.xShift;
		const hook = lineSpace * 0.6;
		ctx.fillRect(x, top, NON_ARPEGGIATE_THICKNESS, bottom - top);
		ctx.fillRect(x, top, hook, NON_ARPEGGIATE_THICKNESS);
		ctx.fillRect(
			x,
			bottom - NON_ARPEGGIATE_THICKNESS,
			hook,
			NON_ARPEGGIATE_THICKNESS,
		);
	}
}

/*
 * Everything MusicXML hangs off a note that isn't the note itself: its <articulations>,
 * <ornaments>, <technical> marks, fermata, arpeggio — and its <lyric> verses, which are a
 * sibling of <notations> in the file but the same kind of thing here, a modifier attached to
 * a built StaveNote.
 *
 * Kept apart from ChordTranslator, which builds the note these decorate, because none of it
 * touches the notehead: the note is finished before any of this lands on it.
 */
export class NotationTranslator {
	/* Attach everything `chord` asks for to the StaveNote built from it. */
	attach(staveNote: StaveNote, chord: Chord): void {
		const lead = chord.lead;
		this.addArticulations(staveNote, lead);
		this.addTechnicals(staveNote, chord);
		this.addOrnaments(staveNote, lead);
		this.addFermata(staveNote, lead);
		this.addArpeggio(staveNote, lead);
		this.addNonArpeggiate(staveNote, chord);
		this.addLyrics(staveNote, lead);
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
	}

	/*
	 * The ornament glyphs above a notehead: trills, turns, mordents, the schleifer, and the
	 * slashes of a single-note <tremolo>.
	 *
	 * An <accidental-mark> is not an ornament of its own — it is the small sharp/flat drawn with
	 * the ornament it follows (an F# turn), so it attaches to the last one built. MusicXML gives
	 * each a placement, but the pair on a turn conventionally reads one above and one below, so
	 * the first goes over the glyph and the second under it.
	 * ponytail: <wavy-line> is left to the tab path (it becomes a Vibrato there). On a notation
	 * stave a trill's extension line needs a start..stop spanner like buildWedges — add one when
	 * a fixture needs the line rather than the "tr" alone.
	 */
	private addOrnaments(staveNote: StaveNote, note: Note): void {
		let last: Ornament | undefined;
		let accidentalMarks = 0;
		for (const ornament of note.ornaments) {
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
				// <tremolo type="single">N</tremolo>: N slashes through the stem.
				// ponytail: the type="start"/"stop" bowed-tremolo pair (slashes BETWEEN two notes)
				// is not handled — it needs a spanner, and no fixture reaches it yet.
				staveNote.addModifier(new Tremolo(ornament.tremoloMarks || 1));
				continue;
			}
			const type = ORNAMENT_TYPES[ornament.ornamentType];
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
	 * "(2)" respectively. Empty elements — an exporter's placeholder — contribute nothing.
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
	 * addTabModifiers): the bowing/tonguing/pizzicato glyphs, the <fingering>/<pluck> labels,
	 * and the <string> indicator.
	 *
	 * Fingerings are per chord MEMBER, so they read off the chord rather than its lead, and they
	 * stack outward from the notes: the digit nearest the stave belongs to the chord member
	 * nearest it. vexflow stacks a note's annotations in the order they're added, so an ABOVE
	 * column is added bottom-member first and a BELOW column top-member first.
	 *
	 * String numbers are added after the fingerings so the circled number sits OUTSIDE the digit
	 * it shares a note with, whichever order the two came in the file.
	 * ponytail: <string> draws as vexflow's circled Arabic numeral (the guitar convention).
	 * Bowed-string parts conventionally take Roman numerals instead — OSMD picks those — which
	 * needs its own glyph and a way to know the instrument family. Add it if a fixture asks.
	 */
	private addTechnicals(staveNote: StaveNote, chord: Chord): void {
		const strings: { index: number; number: string; below: boolean }[] = [];
		const fingerings: { index: number; text: string; below: boolean }[] = [];
		chord.notes.forEach((note, index) => {
			const labels: Technical[] = [];
			let below = false;
			for (const mark of note.technicals) {
				if (mark.placement === 'below') {
					below = true;
				}
				if (
					mark.technicalType === 'fingering' ||
					mark.technicalType === 'pluck'
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
				const code = TECHNICAL_CODES[mark.technicalType];
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
			const text = this.fingeringLabel(labels);
			if (text) {
				fingerings.push({ index, text, below });
			}
		});
		// Bottom-member first going up, top-member first going down — see the note above.
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
	 * the side is the fermata's type, not the stem direction.
	 */
	private addFermata(staveNote: StaveNote, note: Note): void {
		const fermata = note.fermata;
		if (!fermata) {
			return;
		}
		const inverted = fermata === 'inverted';
		const articulation = new StaveArticulation(inverted ? 'a@u' : 'a@a');
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
		staveNote.addModifier(new Stroke(type), 0);
	}

	/*
	 * A <notations><non-arpeggiate>: the bracket marking a chord to be struck together, the
	 * explicit opposite of the arpeggio wiggle. MusicXML puts type="bottom" on the lowest
	 * member it covers and type="top" on the highest, and the members between carry nothing —
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
	 * between the two — a centered hyphen needs a spanner across notes (and systems). The
	 * melisma <extend/> flag is passed through for LyricPlacer.pin to draw.
	 */
	private addLyrics(staveNote: StaveNote, lead: Note): void {
		const verses = [...lead.lyrics].sort(
			(a, b) => Number(a.verse) - Number(b.verse),
		);
		verses.forEach((verse, index) => {
			const syllabic = verse.syllabic;
			const hyphen = syllabic === 'begin' || syllabic === 'middle' ? '-' : '';
			const text = this.syllableOf(verse) + hyphen;
			if (text) {
				staveNote.addModifier(new LyricAnnotation(text, index, verse.extend));
			}
		});
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
