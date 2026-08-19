import type { Chord, Note } from '@stringsync/mdom';
import {
	Annotation,
	Bend,
	Element,
	GhostNote,
	GraceNoteGroup,
	GraceTabNote,
	Stem,
	type StemmableNote,
	TabNote,
	Vibrato,
} from 'vexflow';
import type { TabStemPlacement } from './config';
import {
	TAB_FRET_SCALE,
	TAB_GRACE_SCALE,
	TAB_GRACE_SPACING,
} from './constants';
import type { DurationTranslator } from './duration-translator';

/*
 * Where a note sits on the fretboard when `<technical>` doesn't say. Some exporters give a
 * tab note only its pitch, leaving the string/fret to be derived from the staff tuning —
 * without this it would print fret 0 on string 1 no matter what it sounds.
 *
 * Pick the highest string the note is reachable on, i.e. the smallest non-negative fret:
 * that is the ordinary first-position fingering and matches what MuseScore derives. A note
 * below every open string is unplayable as written; put it on the lowest string at fret 0
 * rather than dropping it, so the tab still shows something at that tick.
 *
 * `tuning` is indexed by string - 1 (see stringTuning). An explicit `<string>` wins — only
 * its fret is derived — so a hand-fingered voicing keeps the string the editor chose.
 */
/* Semitones above C for each MusicXML <step>. */
const STEP_SEMITONES: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

type FretElement = Element & { fontWeight: string };

/*
 * Translates one voice's mdom chords to the vexflow tickables that draw them on a tablature
 * staff: a TabNote per struck chord, sized and styled for the fret digits, with the rests and
 * held notes tab convention leaves unprinted reserved as invisible time.
 *
 * Separate from ChordTranslator because almost nothing carries over: a tab note has no clef,
 * key, accidental or notehead, and its digits are restyled through vexflow internals the
 * notation path never touches.
 */
export class TabVoiceTranslator {
	constructor(
		private readonly durations: DurationTranslator,
		// Whether/where TabNotes are built with stems (and flags). See Config.tabStemPlacement.
		private readonly tabStemPlacement: TabStemPlacement = 'none',
	) {}

	/* The held tail of a tie: the string isn't re-struck, so guitar tab omits its fret. */
	private isHeld(note: Chord['notes'][number]): boolean {
		return note.ties.some((tie) => tie.tieType === 'stop');
	}

	/*
	 * A tab voice's tickables: one TabNote per non-rest chord, in onset order. Grace
	 * chords steal no time, so like VoiceTranslator.tickables they're held aside and
	 * attached to the next real note as a GraceNoteGroup modifier (drawn just left of
	 * it). A rest reserves its duration with invisible GhostNotes rather than a drawn
	 * rest glyph (tab convention omits rests) — without that reserved time, a tab note
	 * after a rest slides left and falls out of vertical alignment with the notation
	 * stave it's formatted against. `record` captures each chord's lead -> TabNote for
	 * later hammer-on/pull-off resolution; the layout pass reuses this to size tab
	 * measures and passes none. `tuning` is the staff's open-string pitches, used to
	 * derive the string/fret of a note whose `<technical>` omits them (see positions()).
	 */
	tickables(
		chords: Chord[],
		tuning: number[] | null,
		// rule-ignore objects-over-callbacks: the notation path's `record` and this one are the
		// same collector, scoped to the one call for the same reason — see
		// VoiceTickablesOptions.record.
		record?: (lead: Note, tickable: StemmableNote) => void,
	): StemmableNote[] {
		const tickables: StemmableNote[] = [];
		let pendingGrace: { note: GraceTabNote; lead: Note }[] = [];
		for (const chord of chords) {
			if (chord.lead.isRest) {
				tickables.push(...this.durations.ghostNotes(chord.lead.beats ?? 0));
				continue;
			}
			if (chord.lead.isGrace) {
				pendingGrace.push({
					note: this.tabGrace(chord, tuning),
					lead: chord.lead,
				});
				continue;
			}
			// A wholly tied-into (held) chord re-strikes no string, so guitar tab convention
			// omits every fret. Reserve its time with invisible ghosts (keeping the tab
			// aligned with the notation stave, which still draws the tied noteheads) rather
			// than printing the held frets.
			if (chord.notes.every((note) => this.isHeld(note))) {
				if (chord.lead.timeModification) {
					// A held note inside a tuplet: reserve it as ONE duration-coded ghost and
					// `record` it, so buildTuplets rescales this lone tickable with the tuplet —
					// a triplet that opens on a tied note (measure 25 of the jazz corpus) must
					// compress the frets after it or they drift right. the duration translator's ghosts can't stand in:
					// a tuplet-sized hole isn't dyadic, so it would drop a sub-128th remainder.
					const ghost = new GhostNote({
						duration: this.durations.code(chord.lead),
						dots: chord.lead.dots,
					});
					tickables.push(ghost);
					record?.(chord.lead, ghost);
				} else {
					// Outside a tuplet, keep the dyadic gap-fill: collapsing a compound duration
					// (e.g. a dotted held note) into one ghost would shift the softmax spacing of
					// neighboring notes (see grace_spacing).
					tickables.push(...this.durations.ghostNotes(chord.lead.beats ?? 0));
				}
				continue;
			}
			const tabNote = this.tabChord(chord, tuning);
			if (pendingGrace.length > 0) {
				// No beamNotes() unlike the standard-notation path: tab grace notes have no
				// stem to anchor a beam, so beaming floats it off the staff — they render as
				// plain small fret numbers.
				const group = new GraceNoteGroup(pendingGrace.map((g) => g.note));
				// preFormat now so the width pad survives format()'s preFormatted guard.
				group.preFormat();
				group.setWidth(group.getWidth() + TAB_GRACE_SPACING);
				tabNote.addModifier(group, 0);
				// Record grace leads too so a slur from a grace note to its main note
				// resolves in buildHammerPulls (the GraceTabNote is a valid tie endpoint).
				for (const g of pendingGrace) {
					record?.(g.lead, g.note);
				}
				pendingGrace = [];
			}
			record?.(chord.lead, tabNote);
			tickables.push(tabNote);
		}
		return tickables;
	}

	/*
	 * Build a vexflow TabNote for one chord on a tablature stave: each member's
	 * <string>/<fret> becomes a position (string 1 = highest-pitched). Tab notes carry
	 * no clef, accidentals, or stems — just the fret numbers stacked on their strings,
	 * plus any bend/vibrato/annotation modifiers from <notations>.
	 */
	private tabChord(chord: Chord, tuning: number[] | null): TabNote {
		const lead = chord.lead;
		const duration = this.durations.code(lead);
		const tabNote = new TabNote(
			{
				positions: this.positions(chord, tuning),
				duration,
				// Count the dot(s) in the note's ticks (as the notation path does) so a dotted
				// tab note isn't a tick-position short and drift out of alignment with the
				// notation stave it's formatted against. Tab omits the drawn dot glyph.
				dots: lead.dots,
				stemDirection: this.tabStemPlacement === 'above' ? Stem.UP : Stem.DOWN,
			},
			this.tabStemPlacement !== 'none',
		);
		this.styleFrets(tabNote);
		this.addTabModifiers(tabNote, lead);
		return tabNote;
	}

	/*
	 * A grace TabNote (small fret numbers) for one grace chord, grouped onto the real
	 * note it precedes by tickables. Frets are scaled to TAB_GRACE_SCALE of the
	 * (already enlarged) main-note size so graces stay proportionally smaller.
	 */
	private tabGrace(chord: Chord, tuning: number[] | null): GraceTabNote {
		const duration = this.durations.code(chord.lead);
		const grace = new GraceTabNote({
			positions: this.positions(chord, tuning),
			duration,
		});
		this.styleFrets(grace, TAB_FRET_SCALE * TAB_GRACE_SCALE);
		return grace;
	}

	/*
	 * Each chord member's <string>/<fret> as a vexflow tab position (string 1 =
	 * highest-pitched, an open string is fret 0). A natural harmonic is notated as the fret
	 * in angle brackets, e.g. <12> — vexflow renders the fret string verbatim.
	 *
	 * A member with no <technical> carries only a pitch; `tuning` (the staff's
	 * <staff-tuning>, null when it declares none) derives its string/fret — see
	 * derivePosition.
	 *
	 * A tie-stop fret is the held tail of a tie: the string isn't re-struck, so guitar tab
	 * convention omits its number (unlike a slur/hammer-on/pull-off, which changes fret and
	 * is drawn). Filter those out; a wholly-held chord never reaches here — tickables
	 * replaces it with a ghost note — but keep an all-members fallback so the grace path (which
	 * also calls this) can never hand vexflow an empty position list.
	 */
	private positions(chord: Chord, tuning: number[] | null) {
		const toPosition = (note: Chord['notes'][number]) => {
			const derived =
				tuning && note.fret == null ? this.derivePosition(note, tuning) : null;
			const fret = note.fret ?? derived?.fret ?? 0;
			// A dead note (<notehead>x</notehead>) prints "X" on its string instead of a fret;
			// a harmonic angle-brackets its fret. vexflow renders the fret string verbatim.
			let fretText: string | number = fret;
			if (note.notehead?.value === 'x') {
				// A dingbat "✕" (U+2715), not an ASCII "X": the notation font (Bravura) draws an
				// ornate glyph for "X" and would win the CSS font fallthrough, but it lacks this
				// dingbat, so the fret falls through to the plain text font like the fret digits do.
				fretText = '✕';
			} else if (note.isHarmonic) {
				fretText = `<${fret}>`;
			} else if (note.notehead?.parentheses) {
				// A ghost/optional fret reads as "(2)". vexflow renders the fret string verbatim.
				fretText = `(${fret})`;
			}
			return {
				str: note.string ?? derived?.str ?? 1,
				fret: fretText,
			};
		};
		const struck = chord.notes.filter((note) => !this.isHeld(note));
		return (struck.length > 0 ? struck : chord.notes).map(toPosition);
	}

	private derivePosition(
		note: Chord['notes'][number],
		tuning: number[],
	): { str: number; fret: number } | null {
		const pitch = note.pitch;
		if (!pitch) {
			return null;
		}
		const midi = this.midiOf(pitch.step, pitch.octave, pitch.alter ?? 0);
		if (note.string != null) {
			const open = tuning[note.string - 1];
			return open == null
				? null
				: { str: note.string, fret: Math.max(0, midi - open) };
		}
		let best: { str: number; fret: number } | null = null;
		for (const [index, open] of tuning.entries()) {
			const fret = midi - open;
			if (fret >= 0 && (best === null || fret < best.fret)) {
				best = { str: index + 1, fret };
			}
		}
		return best ?? { str: tuning.length, fret: 0 };
	}

	/* MIDI number of a step/octave/alter, the common scale a pitch and a string's tuning compare on. */
	private midiOf(step: string, octave: number, alter = 0): number {
		return (
			(octave + 1) * 12 + (STEP_SEMITONES[step.toUpperCase()] ?? 0) + alter
		);
	}

	/*
	 * Attach the lead note's tablature articulations to its TabNote, reading straight
	 * from <notations>: a <bend> (with optional <release/> for a bend-and-release),
	 * free-text <other-technical>, and <ornaments><wavy-line> vibrato. All are vexflow
	 * modifiers, so attaching them here means the layout pass — which also calls this —
	 * sizes measures with the extra width they take. (A <harmonic> is drawn as an
	 * angle-bracketed fret in positions(), not a modifier.)
	 */
	private addTabModifiers(tabNote: TabNote, lead: Note): void {
		const bend = lead.bend;
		if (bend) {
			const phrase = [{ type: Bend.UP, text: this.bendLabel(bend.semitones) }];
			// ponytail: a <release/> child draws a bend-then-release (up-down arrow); a
			// release to a non-zero target would need its own label — add when a fixture wants it.
			if (bend.release) {
				phrase.push({ type: Bend.DOWN, text: '' });
			}
			tabNote.addModifier(new Bend(phrase), 0);
		}
		const other = lead.otherTechnical[0];
		if (other) {
			const noteWidth = (tabNote as unknown as { width: number }).width;
			tabNote.addModifier(this.tabAnnotation(other, noteWidth), 0);
		}
		if (lead.wavyLines.some((w) => w.wavyLineType === 'start')) {
			tabNote.addModifier(new Vibrato(), 0);
		}
	}

	/*
	 * A tab-stave text Annotation (palm mute "P.M.", a dead-note "x", …), justified above
	 * the fret numbers.
	 */
	private tabAnnotation(text: string, noteWidth: number): Annotation {
		const annotation = new Annotation(text).setVerticalJustification(
			Annotation.VerticalJustify.TOP,
		);
		// The fret glyph draws centered on the note's x (drawPositions: tabX = x - width/2), but the
		// formatter lands an ABOVE annotation half a note-width to the right of it. The modifier
		// formatter treats xShift as a leftward shift, so half a note-width re-centers the text over
		// the fret. (Centering is width-independent here, so the text font's measured width — narrow
		// in the notation-first stack — doesn't affect it.)
		annotation.setXShift(noteWidth / 2);
		return annotation;
	}

	/*
	 * <bend-alter> in semitones -> the label drawn above the bend arrow. Guitar bends
	 * are notated in whole steps: 2 semitones = "1", 1 = "½", 3 = "1½", 4 = "2".
	 */
	private bendLabel(semitones: number): string {
		const whole = Math.floor(semitones / 2);
		const half = semitones % 2 === 1 ? '½' : '';
		return whole > 0 ? `${whole}${half}` : half || '0';
	}

	/*
	 * Restyle a TabNote's fret digits in place. VexFlow has no public API to set the
	 * 'TabNote.text' metric globally (Metrics isn't exported), so override each fret Element
	 * built in the constructor — fretElement is protected, hence the cast. Resizing rebuilds
	 * each digit's vertical centering and the note width off the new glyphs so the formatter
	 * reserves the right horizontal space. Grace notes pass a smaller scale.
	 */
	private styleFrets(
		tabNote: TabNote | GraceTabNote,
		scale = TAB_FRET_SCALE,
	): void {
		const note = tabNote as unknown as {
			fretElement: FretElement[];
			width: number;
		};
		let width = 0;
		for (const el of note.fretElement) {
			if (el.getText().includes('<')) {
				this.styleHarmonicFret(el, scale);
			} else {
				this.boldFret(el, scale);
			}
			width = Math.max(el.getWidth(), width);
		}
		note.width = width;
	}

	/*
	 * A natural harmonic fret reads as "<12>": the angle brackets stay thin/unbolded while the
	 * fret number inside is bold like an ordinary fret. VexFlow draws one fillText per Element,
	 * so a single element can't mix weights — make the parent hold the bold digits and hang the
	 * two thin brackets off it as child Elements (renderText draws children with their own
	 * font). The pieces lay out left-to-right within the parent's reported width, which
	 * drawPositions centers on the note x and clears the staff line behind.
	 */
	private styleHarmonicFret(el: FretElement, scale: number): void {
		const open = this.harmonicBracket('<', scale);
		const close = this.harmonicBracket('>', scale);
		el.setText(el.getText().replace(/[<>]/g, ''));
		this.boldFret(el, scale);
		const openWidth = open.getWidth();
		const digitsWidth = el.getWidth();
		open.setX(0);
		el.setXShift(openWidth);
		close.setX(openWidth + digitsWidth);
		el.addChild(open);
		el.addChild(close);
		// Set width last: any font/text change reinvalidates and would recompute it to the bare
		// digit width, dropping the brackets from centering and the cleared background.
		el.setWidth(openWidth + digitsWidth + close.getWidth());
	}

	/*
	 * One thin (non-bold) angle bracket, sized to match the bolded digits it flanks. Mirrors
	 * VexFlow's TabNote.tabToElement so it picks up the default 'TabNote.text' font. The +1
	 * drops the bracket a pixel below dead-center so it sits optically level with the heavier
	 * bold digits (the thin glyph otherwise reads as floating high).
	 */
	private harmonicBracket(glyph: '<' | '>', scale: number): Element {
		const el = new Element('TabNote.text');
		el.setText(glyph);
		el.setFontSize(el.fontSizeInPoints * scale);
		el.setYShift(el.getHeight() / 2 + 1);
		return el;
	}

	/*
	 * Bold and enlarge a fret digit Element, re-centering it vertically on its string line.
	 */
	private boldFret(el: FretElement, scale: number): void {
		el.fontWeight = 'bold';
		el.setFontSize(el.fontSizeInPoints * scale);
		el.setYShift(el.getHeight() / 2);
	}
}
