import type { Measure as MMeasure } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import { Element } from './element.js';
import type { Measure } from './measure.js';
import type { System } from './system.js';
import type { Viewport } from './viewport.js';
export declare class MeasureBox extends Element {
    private readonly number;
    private readonly index;
    private readonly sources;
    private system;
    private readonly measureList;
    readonly type = "measure";
    constructor(rect: Rect, viewport: Viewport, number: string, index: number, sources: readonly MMeasure[], system: System, measureList: readonly Measure[]);
    getSources(): readonly MMeasure[];
    getNumber(): string;
    getIndex(): number;
    getSystem(): System;
    rehome(system: System): void;
    getMeasures(): Measure[];
}
