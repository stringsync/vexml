import type { MDocument, Measure } from '@stringsync/mdom';
import type { GapPosition } from './config.js';
import type { ScoreReader } from './score-reader.js';
export declare class GapInserter {
    private readonly reader;
    constructor(reader: ScoreReader);
    insert(document: MDocument, positions: readonly GapPosition[]): Measure[];
    private indexesOf;
    private blockAround;
}
