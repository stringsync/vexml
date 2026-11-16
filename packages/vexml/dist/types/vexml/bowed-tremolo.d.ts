import { Element, type StaveNote } from 'vexflow/core';
export declare class BowedTremolo extends Element {
    private readonly from;
    private readonly to;
    private readonly marks;
    constructor(from: StaveNote, to: StaveNote, marks: number);
    draw(): void;
}
