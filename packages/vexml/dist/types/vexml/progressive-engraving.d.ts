import type { Part } from '@stringsync/mdom';
import { type Events } from '../core/events/index.js';
import type { Config } from './config.js';
import type { Drawing, DrawingEventMap } from './drawing.js';
import type { ElementFactory } from './element-factory.js';
import type { ElementIndex } from './element-index.js';
import type { ElementPlacer } from './element-placer.js';
import type { IdleScheduler } from './idle-scheduler.js';
import type { LayoutPlan } from './layout-plan.js';
import type { PaintProbe } from './paint-probe.js';
import type { ProvisionalGeometry } from './provisional-geometry.js';
import type { GapInfo } from './score.js';
import type { Engraving, RawGeometry } from './score-drawer.js';
import { ScoreRecording } from './score-recording.js';
import type { Sequence } from './sequence.js';
import type { SequencePlacer } from './sequence-placer.js';
import type { SystemDraw } from './system-draw.js';
export interface ProgressiveSink {
    extendEngraving(engraving: Engraving, from: number): void;
}
export interface ProgressiveView {
    visibleBottom(): number;
}
export interface ProgressiveEngravingDeps {
    draw: SystemDraw;
    plan: LayoutPlan;
    provisional: ProvisionalGeometry;
    planned: RawGeometry;
    elements: ElementIndex;
    placer: ElementPlacer;
    sequence: Sequence;
    timeline: SequencePlacer;
    gaps: GapInfo[];
    parts: Part[];
    factory: ElementFactory;
    config: Config;
    probe: PaintProbe;
    scheduler: IdleScheduler;
    sink: ProgressiveSink;
}
export declare class ProgressiveEngraving implements Drawing {
    private readonly deps;
    private readonly dispatcher;
    readonly events: Events<DrawingEventMap>;
    private readonly forecastByMeasure;
    private forecastVersion;
    private pending;
    private shownOps;
    private stepped;
    private pieces;
    private readonly pieceMs;
    private slice;
    private disposed;
    private final;
    private recorded;
    private readonly done;
    private finish;
    constructor(deps: ProgressiveEngravingDeps);
    get elements(): ElementIndex;
    get sequence(): Sequence;
    get gaps(): GapInfo[];
    drawFirstScreen(view: ProgressiveView): void;
    start(): void;
    isComplete(): boolean;
    whenComplete(): Promise<void>;
    drawThroughMeasure(m: number): void;
    drawAll(): void;
    recording(): ScoreRecording;
    dispose(): void;
    private holdForecast;
    private refreshForecast;
    private finished;
    private step;
    private advance;
    private stepInPieces;
    private result;
    private merged;
    private flush;
    private complete;
    private schedule;
    private run;
}
