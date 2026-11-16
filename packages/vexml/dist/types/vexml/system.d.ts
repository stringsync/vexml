import type { Measure as MMeasure } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import { Element } from './element.js';
import type { MeasureBox } from './measure-box.js';
import type { Viewport } from './viewport.js';
export declare class System extends Element {
    private readonly index;
    private readonly boxList;
    readonly type = "system";
    constructor(rect: Rect, viewport: Viewport, index: number, boxList: readonly MeasureBox[]);
    getSources(): readonly MMeasure[];
    getIndex(): number;
    getMeasureBoxes(): MeasureBox[];
}
