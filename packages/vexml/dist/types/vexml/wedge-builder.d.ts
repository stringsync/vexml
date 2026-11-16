import type { Note } from '@stringsync/mdom';
import type { StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import { Hairpin } from './hairpin.js';
import type { WedgeMark } from './score-reader.js';
import { type SpanScope } from './span-scope.js';
export type WedgeOptions = {
    scope?: SpanScope;
    wraps?: (from: StaveNote, to: StaveNote) => boolean;
};
export declare class WedgeBuilder {
    private readonly appearance;
    constructor(appearance: Appearance);
    build(markers: WedgeMark[], byLead: Map<Note, StaveNote>, { scope, wraps, }?: WedgeOptions): Hairpin[];
}
