import type { Chord, Note } from '@stringsync/mdom';
import type { PedalMarking, Stave, StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import type { PedalMark } from './score-reader.js';
import { type SpanScope } from './span-scope.js';
export type PedalOptions = {
    scope?: SpanScope;
    /** The system index a drawn note sits on; when provided, cross-system pedals split per system. */
    systemOf?: (note: StaveNote) => number;
    /** The stave row a drawn note sits on, so cross-system spans stay on their own row. */
    rowOf?: (note: StaveNote) => number | undefined;
    /** The right barline x of the system row `stave` sits on, for open-ended continuation segments. */
    systemEndX?: (stave: Stave) => number;
};
export declare class PedalBuilder {
    private readonly appearance;
    constructor(appearance: Appearance);
    build(markers: PedalMark[], byLead: Map<Note, StaveNote>, chords: Chord[], { scope, systemOf, rowOf, systemEndX }?: PedalOptions): {
        marking: PedalMarking;
        notes: StaveNote[];
    }[];
    private splitBySystem;
    private pedalSpan;
}
