import type { Note } from '@stringsync/mdom';
import type { PitchInput } from './pitch-edit.js';
export interface TabPositionInput {
    string: number;
    fret: number;
    pitch: PitchInput;
}
/** Atomic pitch and fingering command for tab notes. Run inside an mdom transaction. */
export declare class TabPositionEdit {
    private readonly notes;
    constructor(notes: readonly Note[]);
    apply(spec: TabPositionInput): boolean;
}
