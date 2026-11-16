import type { Chord, Note } from '@stringsync/mdom';
import type { PedalMarking, StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import type { PedalMark } from './score-reader.js';
import { type SpanScope } from './span-scope.js';
export type PedalOptions = {
    scope?: SpanScope;
};
export declare class PedalBuilder {
    private readonly appearance;
    constructor(appearance: Appearance);
    build(markers: PedalMark[], byLead: Map<Note, StaveNote>, chords: Chord[], { scope }?: PedalOptions): {
        marking: PedalMarking;
        notes: StaveNote[];
    }[];
    private pedalSpan;
}
