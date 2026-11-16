import { type StaveNote } from 'vexflow/core';
import { StaveArticulation } from './stave-articulation.js';
export declare class NoteheadArticulation extends StaveArticulation {
    private readonly codes;
    constructor(code: string | [above: string, below: string]);
    setSide(staveNote: StaveNote, side?: 'notehead' | 'stem'): this;
}
