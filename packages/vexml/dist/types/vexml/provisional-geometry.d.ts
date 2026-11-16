import type { Score } from '@stringsync/mdom';
import type { LayoutForecast } from './layout-plan.js';
import type { ScoreLayout } from './layout-planner.js';
import type { RawGeometry } from './score-drawer.js';
import type { ScoreReader } from './score-reader.js';
import type { StavePlan } from './stave-plan.js';
export declare class ProvisionalGeometry {
    readonly reader: ScoreReader;
    readonly staves: StavePlan;
    private readonly score;
    private readonly layout;
    private readonly stack;
    private readonly pitch;
    private readonly rows;
    private readonly sounding;
    constructor(reader: ScoreReader, staves: StavePlan, score: Score, layout: Pick<ScoreLayout, 'top' | 'floorHeight' | 'systemGap' | 'staveOffsets' | 'width'>);
    systemTop(system: number): number;
    geometryOf(forecast: LayoutForecast, measures?: Iterable<number>): RawGeometry;
}
