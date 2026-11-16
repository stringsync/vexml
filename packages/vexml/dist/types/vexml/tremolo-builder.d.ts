import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote } from 'vexflow/core';
import { BowedTremolo } from './bowed-tremolo.js';
import type { ScoreReader } from './score-reader.js';
export declare class TremoloBuilder {
    private readonly reader;
    constructor(reader: ScoreReader);
    build(chords: Chord[], byLead: Map<Note, StaveNote>): BowedTremolo[];
}
