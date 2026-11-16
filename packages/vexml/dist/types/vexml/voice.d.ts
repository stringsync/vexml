import type { Note, NoteKey, NoteLookup } from './note.js';
export declare class Voice {
    private readonly id;
    private readonly stave;
    private readonly keys;
    private readonly notes;
    constructor(id: string, stave: number, keys: readonly NoteKey[], notes: NoteLookup);
    getId(): string;
    getStave(): number;
    getNotes(): Note[];
}
