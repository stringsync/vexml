import type { BeamRun, Chord, Barline as MBarline, Note } from '@stringsync/mdom';
import { Rect } from '../core/geometry/index.js';
import { BarNote, type RenderContext, Stave, StaveNote, type TabNote, type Voice } from 'vexflow/core';
import type { ChordTranslator } from './chord-translator.js';
import { CollisionResolver } from './collision-resolver.js';
import type { ConnectorDrawer } from './connector-drawer.js';
import type { LyricPlacer } from './lyric-placer.js';
import type { ScoreReader } from './score-reader.js';
import type { SpannerBuilder } from './spanner-builder.js';
import type { SpillTracker } from './spill-tracker.js';
import type { VoiceTranslator } from './voice-translator.js';
export type PendingStave = {
    stave: Stave;
    row: number;
    isTab: boolean;
    vexVoices: Voice[];
    beams: ReturnType<SpannerBuilder['buildBeams']>;
    beamPlans: Array<{
        groups: BeamRun[];
        defaultStem?: 'up' | 'down';
    }>;
    tuplets: ReturnType<SpannerBuilder['buildTuplets']>;
    tremolos: ReturnType<SpannerBuilder['buildTremolos']>;
    tupletChords: Chord[][];
    polymetreRatio?: {
        actual: number;
        normal: number;
    } | null;
    staveNotes: StaveNote[];
    tiedNotes: Set<StaveNote>;
    noteChords: Array<{
        note: StaveNote;
        chord: Chord;
    }>;
    tabChords: Array<{
        note: TabNote;
        chord: Chord;
    }>;
    graceChords: Array<{
        note: StaveNote;
        chord: Chord;
    }>;
    graceTabChords: Array<{
        note: TabNote;
        chord: Chord;
    }>;
    midBars: Array<{
        note: BarNote;
        style: string;
        source: MBarline;
    }>;
};
export declare class SystemFormatter {
    private readonly opts;
    private readonly context;
    private readonly translator;
    private readonly chords;
    private readonly spanners;
    private readonly connectorDrawer;
    private readonly lyricPlacer;
    private readonly collisionResolver;
    private readonly spill;
    private readonly reporter;
    private readonly softmaxFactor;
    private readonly notationColor;
    private readonly byLead;
    private readonly crossStaveNotes;
    private readonly shrunk;
    private readonly articulationPlacer;
    constructor(opts: SystemFormatterOptions);
    alignBegModifiers(staves: readonly Stave[]): number | null;
    private voiceTieEnds;
    private shrinkNoteheads;
    formatAndDraw(pending: PendingStave[], column: FormatColumn): {
        top: number;
        bottom: number;
    };
    private offsetTupletsOverSlurs;
    private tabArcApexRect;
    private tabBendRect;
    private desiredNoteStart;
    private openingNoteStart;
    private signatureNoteStart;
    private closeHiddenGaps;
    private pushAfterGraces;
    private placePauseMarks;
    private orderFermatasOutsideOrnaments;
    private noteTop;
    private accidentalTop;
    private noteGlyphTop;
    private noteBottom;
    private belowMarksBottom;
    private pinTechnicals;
    private placeRests;
    private moveRestsOffBeams;
    private headRect;
    noteRect(note: StaveNote): Rect;
    private tieApexRect;
    private stretchBends;
    private stretchVibratos;
    private alignStaveGraces;
    private maxNotationModLeftByTick;
    private closeStaveGraces;
    private alignTabGraces;
    private recordStaveSpill;
    private spillHost;
    private squareUp;
    private graceGroupOf;
}
export interface FormatColumn {
    /** Which system the column belongs to: the band its lyric-drop and spill
     * measurements report under. */
    systemIndex: number;
    isSystemStart: boolean;
    /** Width at the LEFT end of the measure the notes must not format into, so a centered
     * words directive on the first note prints clear of the opening barline (see MeasureBox). */
    measureLeadingPad: number;
    /** The same at the RIGHT end, so a words directive on the last note has room to print
     * before the barline (see MeasureBox). */
    measureTrailingPad: number;
}
export interface SystemReporter {
    /** Which system a stave belongs to (the column's own system while it's being built). */
    systemOf(stave: Stave): number;
}
export interface SystemFormatterOptions {
    context: RenderContext;
    translator: VoiceTranslator;
    chords: ChordTranslator;
    spanners: SpannerBuilder;
    connectorDrawer: ConnectorDrawer;
    lyricPlacer: LyricPlacer;
    collisionResolver: CollisionResolver;
    spill: SpillTracker;
    /** The pass's bookkeeping, handed over as a narrow view. */
    reporter: SystemReporter;
    reader: ScoreReader;
    documentPositions: boolean;
    /** The formatter's proportional-spacing exponent, shared with the layout's width
     * planning so measures format at the width they were planned for. */
    softmaxFactor: number;
    notationColor: string;
    byLead: ReadonlyMap<Note, StaveNote>;
    crossStaveNotes: ReadonlySet<StaveNote>;
}
