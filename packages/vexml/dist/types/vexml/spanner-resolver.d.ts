import type { Chord, Note } from '@stringsync/mdom';
import { Rect } from '../core/geometry/index.js';
import { type RenderContext, type Stave, type StaveNote, type TabNote } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import type { DirectionPlacer } from './direction-placer.js';
import type { DirectionLineSpan, OctaveShiftSpan, PedalMark, WedgeMark } from './score-reader.js';
import type { SpannerBuilder } from './spanner-builder.js';
import type { SpillTracker } from './spill-tracker.js';
import type { VoiceTranslator } from './voice-translator.js';
export interface SpannerAnchors {
    byLead: Map<Note, StaveNote>;
    byTabLead: Map<Note, TabNote>;
}
export interface SpannerReporter {
    /** The collision obstacle for a drawn note: a box from its top (notehead ∪
     * beam-extended stem tip ∪ above articulations) to its bottom, one notehead wide:
     * what a pedal band or ottava label has to drop/lift clear of. */
    noteObstacle(note: StaveNote): Rect;
    /** The lyric boxes pinned on `stave`, for hairpins resolving after the note pass. */
    lyricObstacles(stave: Stave): readonly Rect[];
    /** A slur bows `bottom` below the stave of `row` in `system`, over its lyrics: have the
     * verse hang clear of it on the next pass. */
    dropLyricsBelow(system: number, row: number, stave: Stave, bottom: number): void;
    /** Ink that reached `top`: keeps the page crop above it. */
    growPageTop(top: number): void;
    /** Ink that reached `bottom`: keeps the page crop below it. */
    growPageBottom(bottom: number): void;
}
export declare class SpannerResolver {
    private readonly octaveShiftSpans;
    private readonly directionLineSpans;
    private readonly showTabSlideText;
    private readonly scratchViewport;
    private readonly appearance;
    private readonly notationFont;
    private readonly allChords;
    private readonly allPedals;
    private readonly allWedges;
    private readonly allTabChords;
    private readonly staveRows;
    private readonly systemOfMeasure;
    private readonly systemStarts;
    private readonly context;
    private readonly spanners;
    private readonly translator;
    private readonly spill;
    private readonly directionPlacer;
    private readonly reporter;
    private readonly systemReach;
    private readonly bows;
    private readonly belowOttavas;
    private readonly stackedHairpins;
    private readonly stackedOttavas;
    constructor(opts: SpannerResolverOptions);
    mark(): SystemStart;
    rewind(mark: SystemStart): void;
    forgetSystem(system: number): void;
    beginSystem(system: number): void;
    registerStave(stave: Stave, row: number, system: number): void;
    private systemOfNote;
    systemOf(stave: Stave): number | undefined;
    addChords(chords: readonly Chord[]): void;
    addTabChords(chords: readonly Chord[]): void;
    addPedals(pedals: readonly PedalMark[]): void;
    addWedges(wedges: readonly WedgeMark[]): void;
    resolve(anchors: SpannerAnchors): void;
    resolveSystem(system: number, anchors: SpannerAnchors): void;
    reachesPast(system: number): boolean;
    private windowStart;
    private resolveIn;
    private dropPedalClear;
    private clearWedge;
    private startPastDynamic;
    private stopAtBarlineBeforeDynamic;
    private observeStackedWords;
    observedHairpinBands(): Map<number, HairpinBand[]>;
    private observeStackedOttava;
    observedOttavaBands(): Map<number, HairpinBand[]>;
    private alignWedgeChains;
    private bowsOnRowOf;
    private addBow;
    private belowOttavasOnRowOf;
    private addBelowOttava;
    private reportBow;
    private clearLyricsOfBow;
    private tieRect;
    private splitBySystem;
    private systemEndX;
    private clearOctaveBracket;
}
interface SystemStart {
    chords: number;
    tabChords: number;
    pedals: number;
    wedges: number;
}
export interface SpannerResolverOptions {
    context: RenderContext;
    spanners: SpannerBuilder;
    translator: VoiceTranslator;
    spill: SpillTracker;
    directionPlacer: DirectionPlacer;
    /** The driver's bookkeeping the resolver reports back through. */
    reporter: SpannerReporter;
    /** The score's <octave-shift> spans; the notes were drawn at the shifted position, and
     * resolve() draws the bracket that says so over them. */
    octaveShiftSpans: readonly OctaveShiftSpan[];
    /** The score's <bracket>/<dashes> spans, drawn alongside the other spanners. */
    directionLineSpans: readonly DirectionLineSpan[];
    /** Print the "sl." label on tablature slides (the line always draws). */
    showTabSlideText: boolean;
    /** The drawable region of the scratch canvas, bounding the scoped collision probes. */
    scratchViewport: Rect;
    /** The system a document measure is drawn on: where a spanner reaching that measure
     * lands, before anything there is drawn. */
    systemOfMeasure(measureIndex: number): number;
    /** The document's glyphs (an ottava's label among them), or Appearance.NONE. */
    appearance: Appearance;
    /** The font family the notation glyphs draw in. */
    notationFont: string;
}
export interface HairpinBand {
    row: number;
    rect: Rect;
}
export {};
