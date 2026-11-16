import type { BeamRun, Note } from '@stringsync/mdom';
import { Beam, type StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import type { ScoreReader } from './score-reader.js';
export type BeamOptions = {
    defaultStem?: 'up' | 'down';
    notesByLead?: Map<Note, StaveNote[]>;
};
export declare class BeamBuilder {
    private readonly reader;
    private readonly appearance;
    constructor(reader: ScoreReader, appearance: Appearance);
    build(groups: BeamRun[], byLead: Map<Note, StaveNote>, opts?: BeamOptions): Beam[];
    private beamOf;
    private isFlatBeam;
    private reorientArticulations;
}
