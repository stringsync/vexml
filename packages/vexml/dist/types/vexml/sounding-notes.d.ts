import type { Note as MNote, Part } from '@stringsync/mdom';
import type { RawNote } from './geometry-collector.js';
import type { ScoreReader } from './score-reader.js';
import type { StavePlan } from './stave-plan.js';
export interface Placeholder {
    mnote: MNote;
    chord: MNote[];
    beat: number;
    span: number;
    part: number;
    staffNumber: string;
    tab: RawNote['tab'];
}
export declare class SoundingNotes {
    private readonly reader;
    private readonly staves;
    private readonly parts;
    private readonly placeholders;
    private multiRests;
    constructor(reader: ScoreReader, staves: StavePlan, parts: Part[]);
    of(m: number): Placeholder[];
    private staveOf;
}
