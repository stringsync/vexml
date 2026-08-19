import type { Chord, Note } from '@stringsync/mdom';
import {
	type BarNote,
	ClefNote,
	type GraceNote,
	GraceNoteGroup,
	Modifier,
	StaveNote,
	type StemmableNote,
	Voice,
} from 'vexflow';
import type { BarlineTranslator } from './barline-translator';
import type { ChordTranslator } from './chord-translator';
import { EPSILON, GRACE_SPACING } from './constants';
import type { DurationTranslator } from './duration-translator';
import type { MidClefSpec } from './signature-translator';

/** What a vexflow voice holds: its notes/rests/ghosts, plus the zero-duration BarNotes and
 * ClefNotes a mid-measure `<barline>` or `<clef>` puts between them. */
export type VoiceTickable = StemmableNote | BarNote | ClefNote;

/* The duration codes that draw a flag, and so can carry a beam instead. */
const FLAGGED_DURATIONS = new Set(['8', '16', '32', '64', '128']);

/* The settings NoteTranslator.voiceTickables applies to one voice. */
export interface VoiceTickablesOptions {
	/* Pad the voice with ghost notes out to this beat, so an underfull measure still
	 * reserves the trailing space the meter asks for. */
	endBeat?: number;
	/* Called with each lead note and the StaveNote built for it, as they are built, so a
	 * caller can index them. */
	// rule-ignore objects-over-callbacks: this fires DURING the call, handing back what the
	// call is building, and one NoteTranslator is shared by the layout pass and the draw pass
	// (their measured and drawn widths have to match). An Events surface on it would deliver
	// the layout pass's notes to the draw pass's listener and back, which is the bug this
	// per-call collector cannot have.
	record?: (lead: Note, staveNote: StaveNote) => void;
	/* Per-note octave shift, since a mid-measure clef change can vary it note by note
	 * rather than it being one value for the stave. */
	octaveShiftOf?: (lead: Note) => number;
	/* Stem direction for notes without an explicit <stem>. */
	defaultStem?: 'up' | 'down';
	/* The measure's mid-measure dividers (see ScoreReader.midBarlinesOf), each inserted as
	 * a zero-duration BarNote just before the first note at or past its beat. */
	barlines?: readonly { beat: number; style: string }[];
	/* The measure's mid-measure clef changes (see ScoreReader.midClefsOf). Each one re-aims
	 * every LATER note's staff position. */
	midClefs?: readonly MidClefSpec[];
	/* Also emit the small ClefNote glyph for each midClef. Like a divider, the glyph belongs
	 * to the measure, so it rides on the first voice only. */
	drawMidClefs?: boolean;
}

/*
 * One voice's mdom chords as the vexflow tickables that draw them: a StaveNote per chord in
 * onset order, the zero-duration BarNotes and ClefNotes a mid-measure barline or clef change
 * puts between them, and invisible ghosts holding the time no chord covers. ChordTranslator
 * builds the notes themselves; this decides where each one lands and what goes between.
 *
 * Its other methods are the vexflow plumbing that comes with those tickables: wrapping them
 * in a voice, and the font metric and modifier lookups their callers need. One instance per
 * render, shared by the layout (measuring) pass and the draw pass, so both build their
 * voices (and probe that metric) identically.
 */
export class NoteTranslator {
	constructor(
		private readonly chords: ChordTranslator,
		private readonly durations: DurationTranslator,
		private readonly barlines: BarlineTranslator,
	) {}

	/*
	 * One voice's chords as tickables, in onset order. A voice placed by <backup>/<forward>
	 * needn't start at beat 0, be contiguous, or run to the measure's end, so each note lands
	 * at its chord's own measureBeat rather than where document order would put it, keeping it
	 * aligned with the other voices on the stave. GhostNotes hold the beats that leaves
	 * uncovered: before the first chord, between chords, and after the last one up to
	 * `opts.endBeat`. Without that trailing fill, a voice that stops early lets the formatter
	 * cram the other voices' later notes against its last note. See VoiceTickablesOptions for
	 * what the rest of the settings do.
	 */
	voiceTickables(
		chords: Chord[],
		clef: string,
		opts: VoiceTickablesOptions = {},
	): VoiceTickable[] {
		const {
			endBeat = 0,
			record,
			octaveShiftOf = () => 0,
			defaultStem,
			barlines = [],
			midClefs = [],
			drawMidClefs = true,
		} = opts;
		const tickables: VoiceTickable[] = [];
		// Mid-measure clef changes, consumed the same way the dividers below are. `activeClef`
		// is what the notes after each one are positioned against.
		let activeClef = clef;
		let nextClef = 0;
		const flushClefs = (upTo: number) => {
			for (
				let change = midClefs[nextClef];
				change && change.beat <= upTo + EPSILON;
				change = midClefs[nextClef]
			) {
				activeClef = change.clef;
				if (drawMidClefs) {
					tickables.push(new ClefNote(change.clef, 'small', change.annotation));
				}
				nextClef++;
			}
		};
		// Mid-measure dividers, consumed in order as the cursor reaches each one's beat.
		let nextBarline = 0;
		const flushBarlines = (upTo: number) => {
			for (
				let bar = barlines[nextBarline];
				bar && bar.beat <= upTo + EPSILON;
				bar = barlines[nextBarline]
			) {
				tickables.push(this.barlines.midBarNote(bar.style));
				nextBarline++;
			}
		};
		// A lone whole rest fills the whole measure; center its glyph (full-measure-rest convention).
		const soleLead = chords.filter((c) => !c.lead.isGrace).map((c) => c.lead);
		const lone = soleLead.length === 1 ? soleLead[0] : undefined;
		const centerWholeRest =
			!!lone && lone.isRest && this.durations.code(lone) === 'w';
		let cursor = 0;
		// Grace notes steal no time, so they aren't tickables: they accumulate here and
		// attach to the next real note as a GraceNoteGroup modifier, drawn just left of it.
		let pendingGrace: { note: GraceNote; lead: Note }[] = [];
		// After-graces: a trailing cluster with no note left to lead decorates the note it
		// FOLLOWS instead, attaching to the previous tickable as a RIGHT-positioned group so it
		// draws past that notehead.
		const flushAfterGraces = (
			pendingAfter: { note: GraceNote; lead: Note }[],
		) => {
			const host = tickables.at(-1);
			if (!host || pendingAfter.length === 0) {
				return;
			}
			const group = new GraceNoteGroup(pendingAfter.map((g) => g.note));
			if (this.beamsGraceGroup(pendingAfter)) {
				group.beamNotes();
			}
			group.setPosition(Modifier.Position.RIGHT);
			group.preFormat();
			host.addModifier(group, 0);
			for (const g of pendingAfter) {
				record?.(g.lead, g.note);
			}
		};
		for (const chord of chords) {
			if (chord.lead.isGrace) {
				pendingGrace.push({
					note: this.chords.staveNote(chord, activeClef, {
						octaveShift: octaveShiftOf(chord.lead),
					}) as GraceNote,
					lead: chord.lead,
				});
				continue;
			}
			const onset = chord.measureBeat ?? cursor;
			// Before any ghost padding, so a divider on an empty stretch sits at the moment it
			// falls on rather than being pushed to the next note's edge.
			flushBarlines(onset);
			flushClefs(onset);
			if (onset > cursor + EPSILON) {
				tickables.push(...this.durations.ghostNotes(onset - cursor));
			}
			const staveNote = this.chords.staveNote(chord, activeClef, {
				alignCenter: centerWholeRest,
				octaveShift: octaveShiftOf(chord.lead),
				defaultStem,
			});
			if (pendingGrace.length > 0) {
				const group = new GraceNoteGroup(pendingGrace.map((g) => g.note));
				// The main beam pass skips grace notes (they never enter `byLead`), so a grace
				// cluster beams itself.
				if (this.beamsGraceGroup(pendingGrace)) {
					group.beamNotes();
				}
				// preFormat now so the group's width is available to the layout pass (which reads
				// it to allocate the measure extra room) and stable for draw.
				group.preFormat();
				staveNote.addModifier(group, 0);
				// Give the grace cluster breathing room from the preceding note by padding that
				// note's RIGHT, which pushes the host (and its attached grace) right together so
				// the gap opens before the grace while it stays snug to its host. Inflating the
				// host's own left reservation instead would just let the grace drift left off it.
				// setRightDisplacedHeadPx survives format (only the constructor resets it), but
				// vexflow draws augmentation dots after that displaced-head gap — so skip a note
				// that carries dots, which would otherwise be flung out to the right.
				const prev = tickables.at(-1);
				const prevHasDots = prev
					?.getModifiers()
					.some((m) => m.getCategory() === 'Dot');
				if (prev && !prevHasDots) {
					prev.setRightDisplacedHeadPx(
						prev.getRightDisplacedHeadPx() + GRACE_SPACING,
					);
				}
				// Record grace leads too so a slur from a grace note to its main note
				// resolves in buildSlurs (the GraceNote is a valid Curve endpoint).
				for (const g of pendingGrace) {
					record?.(g.lead, g.note);
				}
				pendingGrace = [];
			}
			record?.(chord.lead, staveNote);
			tickables.push(staveNote);
			cursor = onset + (chord.lead.beats ?? 0);
		}
		// Graces still pending at the end have no note left to lead, so they're after-graces of
		// the last one. Flushed before the trailing ghosts so they anchor to a real note rather
		// than to padding.
		flushAfterGraces(pendingGrace);
		pendingGrace = [];
		flushBarlines(Number.POSITIVE_INFINITY);
		// A clef trailing the last note is the courtesy clef: it draws after that note and
		// before the trailing ghosts, so it sits inside the measure rather than past its fill.
		flushClefs(Number.POSITIVE_INFINITY);
		if (endBeat > cursor + EPSILON) {
			tickables.push(...this.durations.ghostNotes(endBeat - cursor));
		}
		return tickables;
	}

	/*
	 * Wrap tickables in a SOFT-mode vexflow Voice at the score's softmax factor. The width-
	 * measuring pass (layout's measureNoteArea) and the draw pass (buildNotes/buildTabNotes)
	 * must build their voices identically, or the measured width and the drawn width disagree
	 * and notes shear; sharing this builder keeps the two passes in lockstep by construction.
	 */
	softVoice(tickables: VoiceTickable[], softmaxFactor: number): Voice {
		return new Voice()
			.setMode(Voice.Mode.SOFT)
			.setSoftmaxFactor(softmaxFactor)
			.addTickables(tickables);
	}

	/*
	 * VexFlow draws a TabNote's fret digits — and the staff-line gap it clears behind them —
	 * centered on the note's start x, but a StaveNote anchors its notehead's LEFT edge there
	 * (the notehead's center sits half a glyph-width to the right). So a fret lines up under
	 * the notehead's left edge, not its center. SystemFormatter.formatAndDraw recenters by shifting the
	 * whole tab note area right by this; doing it there rather than via the fret's own xShift
	 * keeps the cleared gap moving with the digit (clearRect ignores xShift). The width is a
	 * font metric needing a live canvas, so probe it lazily off a throwaway StaveNote and
	 * cache the first non-zero read. The cache lives on this translator instance — one per
	 * render — so each render re-probes at most once against its own canvas.
	 */
	private noteheadHalfWidthCache = 0;

	noteheadHalfWidth(): number {
		if (this.noteheadHalfWidthCache === 0) {
			this.noteheadHalfWidthCache =
				new StaveNote({ keys: ['c/4'], duration: 'q' }).getGlyphWidth() / 2;
		}
		return this.noteheadHalfWidthCache;
	}

	/*
	 * Find a note's first attached modifier of a given vexflow category (a GraceNoteGroup,
	 * Bend, Vibrato, …), or undefined. vexflow types getModifiers() loosely, so the find needs
	 * a cast; centralizing it keeps that one unsafe cast in a single auditable place instead of
	 * hand-copied at each call site — including across modules, since layout can't import draw
	 * and its graceWidthOf would otherwise re-roll the same find.
	 */
	findModifier<T extends Modifier>(
		note: { getModifiers(): { getCategory(): string }[] },
		category: string,
	): T | undefined {
		return note.getModifiers().find((m) => m.getCategory() === category) as
			| T
			| undefined;
	}

	/*
	 * Whether a cluster of grace notes beams: two or more of them, all of flagged value. A run of
	 * small notes is beamed together whether or not the exporter wrote <beam> markers — both
	 * MuseScore and LilyPond engrave lilypond_24d's unmarked 16th cluster with a beam — so the
	 * markers only matter for telling a beamed run from a genuinely flagged one, which no
	 * fixture writes.
	 */
	private beamsGraceGroup(graces: ReadonlyArray<{ lead: Note }>): boolean {
		return (
			graces.length > 1 &&
			graces.every((g) => FLAGGED_DURATIONS.has(this.durations.code(g.lead)))
		);
	}
}
