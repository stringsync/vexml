import type { Score } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import type { BarlineTranslator } from './barline-translator.js';
import type { ChordTranslator } from './chord-translator.js';
import type { Config } from './config.js';
import type { Fold } from './fold.js';
import type { Gaps } from './gaps.js';
import type { RawChordDiagram, RawMeasure, RawNote } from './geometry-collector.js';
import type { LayoutPlan } from './layout-plan.js';
import type { ScoreLayout } from './layout-planner.js';
import type { PaintOp } from './paint-op.js';
import type { PaintProbe } from './paint-probe.js';
import type { ScoreReader } from './score-reader.js';
import type { SignatureTranslator } from './signature-translator.js';
import type { SpannerBuilder } from './spanner-builder.js';
import type { SpillResolver } from './spill-resolver.js';
import type { StavePlan } from './stave-plan.js';
import { SystemDraw } from './system-draw.js';
import type { TabVoiceTranslator } from './tab-voice-translator.js';
import type { GridOrigin } from './tile-grid.js';
import type { VoiceTranslator } from './voice-translator.js';
export interface RawGeometry {
    bounds: Rect;
    notes: RawNote[];
    measures: RawMeasure[];
    chordDiagrams: RawChordDiagram[];
}
export interface Engraving {
    ops: readonly PaintOp[];
    width: number;
    height: number;
    origin: GridOrigin;
    scale: number;
    fingerprint?: string;
}
export interface DrawResult {
    geometry: RawGeometry;
    engraving: Engraving;
    fold: Fold | null;
    pages: Rect[];
}
export declare class ScoreDrawer {
    private config;
    private translator;
    private chords;
    private tab;
    private signatures;
    private staves;
    private barlines;
    private reader;
    private spanners;
    private gaps;
    private spillResolver;
    constructor(config: Config, translator: VoiceTranslator, chords: ChordTranslator, tab: TabVoiceTranslator, signatures: SignatureTranslator, staves: StavePlan, barlines: BarlineTranslator, reader: ScoreReader, spanners: SpannerBuilder, gaps: Gaps, spillResolver: SpillResolver);
    draw(probe: PaintProbe, score: Score, layout: ScoreLayout): DrawResult;
    begin(probe: PaintProbe, score: Score, plan: LayoutPlan): SystemDraw;
}
