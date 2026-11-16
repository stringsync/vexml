import type { Note } from '@stringsync/mdom';
export type PitchInput = Parameters<Note['setPitch']>[0];
/** Conservative pitch command for ordinary pitched notes. Run inside an mdom transaction. */
export declare class PitchEdit {
    private readonly notes;
    constructor(notes: readonly Note[]);
    apply(spec: PitchInput): boolean;
}
