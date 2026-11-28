import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote } from 'vexflow/core';
import { Appearance } from './appearance.js';
import { BowedTremolo } from './bowed-tremolo.js';
import type { ScoreReader } from './score-reader.js';
export declare class TremoloBuilder {
    private readonly reader;
    private readonly appearance;
    constructor(reader: ScoreReader, appearance?: Appearance);
    build(chords: Chord[], byLead: Map<Note, StaveNote>): BowedTremolo[];
}
