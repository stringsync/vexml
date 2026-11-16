import { MDocument } from '@stringsync/mdom';
import type { Gap } from './config.js';
import type { GapInserter } from './gap-inserter.js';
export declare class Gaps {
    private readonly gaps;
    private readonly inserter;
    private indexes;
    constructor(gaps: readonly Gap[], inserter: GapInserter);
    isEmpty(): boolean;
    inserts(): boolean;
    names(): boolean;
    check(input: string | Blob | MDocument): void;
    resolve(document: MDocument): void;
    documentIndexes(): {
        gap: Gap;
        measureIndex: number;
    }[];
    byMeasureIndex(): Map<number, Gap>;
}
