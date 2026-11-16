import type { Curve, Stave, StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import type { SlurConnector } from './curve-connectors.js';
import type { SlurBow } from './slur-bow.js';
import type { SlurShape } from './slur-shape.js';
export type SlurCurve = {
    curve: Curve;
    stave: Stave | undefined;
    top: number;
    bottom: number;
    left: number;
    right: number;
    crossStave: boolean;
};
export type SlurCurveEnds = {
    from: StaveNote | undefined;
    to: StaveNote | undefined;
    openX: number | undefined;
    shape: SlurShape;
};
export declare class SlurCurveFactory {
    private readonly appearance;
    constructor(appearance: Appearance);
    create(bow: SlurBow, slur: SlurConnector, ends: SlurCurveEnds): SlurCurve;
}
