import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote, VibratoBracket } from 'vexflow/core';
import type { CurveConnectors } from './curve-connectors.js';
import { type SpanScope } from './span-scope.js';
export declare class WavyLineBuilder {
    private readonly connectors;
    constructor(connectors: CurveConnectors);
    build(chords: Chord[], byLead: Map<Note, StaveNote>, scope?: SpanScope): VibratoBracket[];
    private resolveEnd;
    private isTiedWithinSpan;
    private groupByStave;
    private nextNoteOnStave;
    private hasEarlierNoteOnStave;
    private lastStaveBeforeStop;
}
