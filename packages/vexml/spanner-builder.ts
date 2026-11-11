import type { BeamRun, Chord, Note } from '@stringsync/mdom';
import type {
	Beam,
	PedalMarking,
	StaveNote,
	StaveTie,
	StemmableNote,
	TabNote,
	Tuplet,
	VibratoBracket,
} from 'vexflow/core';
import { Appearance } from './appearance';
import { BeamBuilder, type BeamOptions } from './beam-builder';
import type { BowedTremolo } from './bowed-tremolo';
import { CurveConnectors } from './curve-connectors';
import { GlissandoBuilder } from './glissando-builder';
import type { Hairpin } from './hairpin';
import { HammerPullBuilder } from './hammer-pull-builder';
import type { NotationSlide } from './notation-slide';
import { PedalBuilder, type PedalOptions } from './pedal-builder';
import type { PedalMark, ScoreReader, WedgeMark } from './score-reader';
import type { SingleSlide } from './single-slide';
import { SlideBuilder, type SlideOptions } from './slide-builder';
import { SlurBuilder } from './slur-builder';
import type { SlurCurve } from './slur-curve';
import { type SpanScope, WHOLE_SCORE } from './span-scope';
import type { TabCurve } from './tab-curve';
import type { TabSlideLine } from './tab-slide-line';
import { TieBuilder } from './tie-builder';
import { TremoloBuilder } from './tremolo-builder';
import { TupletBuilder } from './tuplet-builder';
import { WavyLineBuilder } from './wavy-line-builder';
import { WedgeBuilder, type WedgeOptions } from './wedge-builder';

/*
 * Builds every spanner of a score from its drawn notes. Each kind has a builder of its own
 * (BeamBuilder, TieBuilder, SlurBuilder, ...), which this hands to with the document's
 * line widths and the curve partners it reads once per render.
 */
export class SpannerBuilder {
	private readonly connectors: CurveConnectors;
	// The document's line widths the spanners draw with: set afresh by every draw pass.
	private appearance = Appearance.NONE;

	constructor(private readonly reader: ScoreReader) {
		this.connectors = new CurveConnectors(reader);
	}

	useDocumentCurves(enabled: boolean): void {
		this.connectors.useDocumentCurves(enabled);
	}

	/* Draw the spanners built from here on to the document's line widths (Appearance.NONE
	 * keeps vexml's own). */
	useAppearance(appearance: Appearance): void {
		this.appearance = appearance;
	}

	/* The slashes of two-note tremolos. */
	buildTremolos(chords: Chord[], byLead: Map<Note, StaveNote>): BowedTremolo[] {
		return new TremoloBuilder(this.reader).build(chords, byLead);
	}

	/* Beams, built before formatting so the beamed notes drop their flags. */
	buildBeams(
		groups: BeamRun[],
		byLead: Map<Note, StaveNote>,
		opts: BeamOptions = {},
	): Beam[] {
		return new BeamBuilder(this.reader, this.appearance).build(
			groups,
			byLead,
			opts,
		);
	}

	/* Tuplet brackets and numbers, built after the beams settle the stems. */
	buildTuplets<T extends StemmableNote>(
		chords: Chord[],
		byLead: Map<Note, T>,
	): Tuplet[] {
		return new TupletBuilder(this.reader, this.appearance).build(
			chords,
			byLead,
		);
	}

	/* Ties, drawn after the notes are placed. */
	buildTies(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): StaveTie[] {
		return new TieBuilder(this.connectors, this.appearance).build(
			chords,
			byLead,
			scope,
		);
	}

	/* Hammer-on and pull-off arcs on a tab stave. */
	buildHammerPulls(
		chords: Chord[],
		byTabLead: Map<Note, TabNote>,
		scope: SpanScope = WHOLE_SCORE,
	): TabCurve[] {
		return new HammerPullBuilder(this.connectors).build(
			chords,
			byTabLead,
			scope,
		);
	}

	/* Slide lines and ticks on a tab stave. */
	buildSlides(
		chords: Chord[],
		byTabLead: Map<Note, TabNote>,
		opts: SlideOptions,
	): Array<TabSlideLine | SingleSlide> {
		return new SlideBuilder().build(chords, byTabLead, opts);
	}

	/* Glissando and slide lines on a notation stave. */
	buildGlissandos(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): Array<NotationSlide | SingleSlide> {
		return new GlissandoBuilder().build(chords, byLead, scope);
	}

	/* Hairpins; `wraps` tells a later system from another stave of the same one. */
	buildWedges(
		markers: WedgeMark[],
		byLead: Map<Note, StaveNote>,
		opts: WedgeOptions = {},
	): Hairpin[] {
		return new WedgeBuilder(this.appearance).build(markers, byLead, opts);
	}

	/* Trill extension lines. */
	buildWavyLines(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): VibratoBracket[] {
		return new WavyLineBuilder().build(chords, byLead, scope);
	}

	/* Pedal signs and lines, each with the notes it covers. */
	buildPedals(
		markers: PedalMark[],
		byLead: Map<Note, StaveNote>,
		chords: Chord[],
		opts: PedalOptions = {},
	): { marking: PedalMarking; notes: StaveNote[] }[] {
		return new PedalBuilder(this.appearance).build(
			markers,
			byLead,
			chords,
			opts,
		);
	}

	/* Slurs, and the hammer-ons and pull-offs a notation stave draws as slurs. */
	buildSlurs(
		chords: Chord[],
		byLead: ReadonlyMap<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): SlurCurve[] {
		return new SlurBuilder(this.connectors, this.appearance).build(
			chords,
			byLead,
			scope,
		);
	}

	/*
	 * The furthest measure index a spanner starting on `note` reaches: its own measure, or
	 * the measure of the furthest partner of any tie, slur, hammer-on, pull-off, slide,
	 * glissando or trill line it starts. Read off the document alone, so it is known before
	 * the far end is drawn: a system-at-a-time resolve keeps the note in its window until
	 * that measure is on the page.
	 */
	reach(note: Note): number {
		return this.connectors.reach(note);
	}
}
