import type { Part as MPart } from '@stringsync/mdom';
import type { Measure } from './measure.js';
export declare class Part {
    private readonly source;
    private readonly id;
    private readonly label;
    private readonly measureList;
    constructor(source: MPart | null, id: string, label: string | null, measureList: readonly Measure[]);
    getSources(): readonly MPart[];
    getId(): string;
    getLabel(): string | null;
    getMeasures(): Measure[];
}
