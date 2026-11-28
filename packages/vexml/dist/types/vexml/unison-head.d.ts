import { NoteHead, type NoteHeadStruct } from 'vexflow/core';
export declare class UnisonHead extends NoteHead {
    private readonly displacedFromColumn;
    private readonly displacementX;
    constructor(struct: NoteHeadStruct, displacedFromColumn: boolean, displacementX: () => number);
    isDisplaced(): boolean;
    getDisplacementX(): number;
}
