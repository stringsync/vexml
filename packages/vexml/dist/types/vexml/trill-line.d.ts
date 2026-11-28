import { type Stave, type StaveNote, VibratoBracket } from 'vexflow/core';
export type TrillLineEnd = {
    kind: 'before-note';
    note: StaveNote;
} | {
    kind: 'barline';
    stave: Stave;
};
export declare class TrillLine extends VibratoBracket {
    private readonly startNote;
    readonly end: TrillLineEnd;
    private vibratoCode;
    constructor(startNote: StaveNote, stopNote: StaveNote, end: TrillLineEnd);
    setVibratoCode(code: number): this;
    draw(): void;
    private startOrigin;
    private stopEdge;
    private noteLeftEdge;
}
