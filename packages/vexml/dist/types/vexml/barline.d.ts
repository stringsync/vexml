import type { Barline as MBarline } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import { Element } from './element.js';
import type { BarlineLocation } from './geometry-collector.js';
import type { Measure } from './measure.js';
import type { Viewport } from './viewport.js';
export declare class Barline extends Element {
    private readonly measure;
    private readonly location;
    private readonly source;
    readonly type = "barline";
    constructor(rect: Rect, viewport: Viewport, measure: Measure, location: BarlineLocation, source: MBarline | null);
    getMeasure(): Measure;
    getLocation(): BarlineLocation;
    getSources(): readonly MBarline[];
}
