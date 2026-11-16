import type { MDocument } from '@stringsync/mdom';
import type { Config } from './config.js';
import type { ElementFactory } from './element-factory.js';
import type { Fold } from './fold.js';
import type { FontLoader } from './font-loader.js';
import type { Host } from './host.js';
import type { IdleScheduler } from './idle-scheduler.js';
import type { PagePainter } from './page-painter.js';
import type { PaintProbe } from './paint-probe.js';
import type { ProgressiveSink, ProgressiveView } from './progressive-engraving.js';
import { Score } from './score.js';
import type { Engraving } from './score-drawer.js';
import type { ScoreEngraver } from './score-engraver.js';
import type { ScoreParser } from './score-parser.js';
import type { ScoreSnapshot } from './score-snapshot.js';
import type { Scroller } from './scroller.js';
import type { SequenceFactory } from './sequence-factory.js';
export interface RenderStage extends Host, PagePainter, ProgressiveSink, ProgressiveView {
    readonly container: HTMLDivElement;
    readonly base: HTMLElement;
    readonly probe: PaintProbe;
    engrave(engraving: Engraving): void;
    readonly scroller: Scroller & {
        cancel(): void;
        suspendForResize(): void;
    };
    setFold(fold: Fold): void;
}
export declare class ScoreRenderer {
    private readonly config;
    private readonly stage;
    private readonly fontLoader;
    private readonly parser;
    private readonly engraver;
    private readonly elementFactory;
    private readonly sequenceFactory;
    private readonly scheduler;
    constructor(config: Config, stage: RenderStage, fontLoader: FontLoader, parser: ScoreParser, engraver: ScoreEngraver, elementFactory: ElementFactory, sequenceFactory: SequenceFactory, scheduler: IdleScheduler);
    render(input: string | Blob | MDocument | ScoreSnapshot): Promise<Score>;
    private engrave;
    private restore;
    private textOf;
    private show;
    private score;
}
