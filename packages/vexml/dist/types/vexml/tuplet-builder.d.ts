import type { Chord, Note } from '@stringsync/mdom';
import { type StemmableNote, Tuplet } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import type { ScoreReader } from './score-reader.js';
export declare class TupletBuilder {
    private readonly reader;
    private readonly appearance;
    constructor(reader: ScoreReader, appearance: Appearance);
    build<T extends StemmableNote>(chords: Chord[], byLead: Map<Note, T>): Tuplet[];
    private tupletDisplay;
}
