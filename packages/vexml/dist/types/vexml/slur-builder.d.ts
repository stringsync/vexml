import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import type { CurveConnectors } from './curve-connectors.js';
import { type SlurCurve } from './slur-curve.js';
import { type SpanScope } from './span-scope.js';
export declare class SlurBuilder {
    private readonly connectors;
    private readonly obstacles;
    private readonly curves;
    constructor(connectors: CurveConnectors, appearance: Appearance);
    build(chords: Chord[], byLead: ReadonlyMap<Note, StaveNote>, scope?: SpanScope): SlurCurve[];
    private graceBulgeUp;
}
