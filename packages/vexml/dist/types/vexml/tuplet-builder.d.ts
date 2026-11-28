import type { Chord, Note } from '@stringsync/mdom';
import { type StemmableNote } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import { DisplayTuplet } from './display-tuplet.js';
import type { ScoreReader } from './score-reader.js';
import { type SpanScope } from './span-scope.js';
export type CrossBarlineTupletOptions<T extends StemmableNote> = {
    scope?: SpanScope;
    splitBySystem?: (notes: T[]) => T[][];
};
export declare class TupletBuilder {
    private readonly reader;
    private readonly appearance;
    constructor(reader: ScoreReader, appearance: Appearance);
    build<T extends StemmableNote>(chords: Chord[], byLead: Map<Note, T>): DisplayTuplet[];
    buildCrossBarline<T extends StemmableNote>(chords: Chord[], byLead: Map<Note, T>, opts?: CrossBarlineTupletOptions<T>): DisplayTuplet[];
    private createTuplet;
    private tupletDisplay;
}
export declare function crossBarlineTupletLeads(chords: readonly Chord[]): Set<Note>;
