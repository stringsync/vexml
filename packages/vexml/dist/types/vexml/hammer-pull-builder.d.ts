import type { Chord, Note } from '@stringsync/mdom';
import type { TabNote } from 'vexflow/core';
import type { CurveConnectors } from './curve-connectors.js';
import { type SpanScope } from './span-scope.js';
import { TabCurve } from './tab-curve.js';
export declare class HammerPullBuilder {
    private readonly connectors;
    constructor(connectors: CurveConnectors);
    build(chords: Chord[], byTabLead: Map<Note, TabNote>, scope?: SpanScope): TabCurve[];
    private pairByString;
}
