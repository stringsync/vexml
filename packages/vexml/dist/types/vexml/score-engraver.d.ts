import type { MDocument } from '@stringsync/mdom';
import type { Config } from './config.js';
import type { Decorations } from './decoration.js';
import type { ElementFactory } from './element-factory.js';
import type { ElementIndex } from './element-index.js';
import type { Gaps } from './gaps.js';
import type { IdleScheduler } from './idle-scheduler.js';
import { LayoutPlanner } from './layout-planner.js';
import type { PaintProbe } from './paint-probe.js';
import { ProgressiveEngraving, type ProgressiveSink } from './progressive-engraving.js';
import type { GapInfo } from './score.js';
import { type DrawResult, ScoreDrawer } from './score-drawer.js';
import type { ScoreReader } from './score-reader.js';
import { ScoreRecording } from './score-recording.js';
import type { Sequence } from './sequence.js';
import type { SequenceFactory } from './sequence-factory.js';
import { StavePlan } from './stave-plan.js';
import type { Viewport } from './viewport.js';
export interface EngravedScore {
    drawn: Omit<DrawResult, 'engraving'> & {
        engraving: DrawResult['engraving'] | null;
    };
    elements: ElementIndex;
    sequence: Sequence;
    gaps: GapInfo[];
    recording: ScoreRecording;
}
export declare class ScoreEngraver {
    private readonly config;
    private readonly layoutPlanner;
    private readonly scoreDrawer;
    private readonly elementFactory;
    private readonly sequenceFactory;
    private readonly configuredGaps;
    private readonly reader;
    private readonly staves;
    constructor(config: Config, layoutPlanner: LayoutPlanner, scoreDrawer: ScoreDrawer, elementFactory: ElementFactory, sequenceFactory: SequenceFactory, configuredGaps: Gaps, reader: ScoreReader, staves: StavePlan);
    static create(config: Config, reader: ScoreReader, gaps: Gaps, elements: ElementFactory, sequences: SequenceFactory): ScoreEngraver;
    check(): void;
    engrave(document: MDocument, probe: PaintProbe, viewport: Viewport, decorations: Decorations): EngravedScore;
    beginProgressive(document: MDocument, probe: PaintProbe, viewport: Viewport, decorations: Decorations, scheduler: IdleScheduler, sink: ProgressiveSink): ProgressiveEngraving | null;
    private gapInfos;
}
