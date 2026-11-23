import { type Beam, type BoundingBox, GraceNoteGroup, type Note, type StaveTie } from 'vexflow/core';
export declare class AfterGraceGroup extends GraceNoteGroup {
    private reach;
    constructor(...args: ConstructorParameters<typeof GraceNoteGroup>);
    /** Let the cluster start as far as `px` past its note's tick x. */
    setReach(px: number): void;
    getLayoutElements(): (Note | Beam | StaveTie)[];
    getBoundingBox(): BoundingBox;
    private slide;
}
