import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote, StaveTie } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import type { CurveConnectors } from './curve-connectors.js';
import { type SpanScope } from './span-scope.js';
export type TieOptions = {
    scope?: SpanScope;
    wraps?: (from: StaveNote, to: StaveNote) => boolean;
};
export declare class TieBuilder {
    private readonly connectors;
    private readonly appearance;
    constructor(connectors: CurveConnectors, appearance: Appearance);
    build(chords: Chord[], byLead: Map<Note, StaveNote>, { scope, wraps, }?: TieOptions): StaveTie[];
    private samePitchMember;
}
