import type { Measure as MMeasure } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import { Element } from './element.js';
import type { StaveModel } from './element-model.js';
import type { MeasureBox } from './measure-box.js';
import type { Part } from './part.js';
import { Stave } from './stave.js';
import type { Viewport } from './viewport.js';
import type { Voice } from './voice.js';
export declare class Measure extends Element {
    private readonly source;
    private readonly number;
    private readonly index;
    private readonly part;
    private readonly column;
    private readonly voiceList;
    private staveList;
    readonly type = "measure";
    constructor(rect: Rect, viewport: Viewport, source: MMeasure | null, number: string, index: number, part: Part, column: MeasureBox, voiceList: readonly Voice[], staveList: readonly StaveModel[]);
    getSources(): readonly MMeasure[];
    getNumber(): string;
    getIndex(): number;
    getPart(): Part;
    getBox(): MeasureBox;
    getVoices(): Voice[];
    getStaves(): Stave[];
    drawn(staves: readonly StaveModel[], rect: Rect): void;
}
