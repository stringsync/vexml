import { Element, type StaveNote } from 'vexflow/core';
export interface BowedTremoloOptions {
    /** Beam thickness in px; defaults to ordinary beam width (Behind Bars p. 225). */
    beamWidth?: number;
    /** Top-to-top distance between adjacent tremolo beams in px. */
    levelDistance?: number;
}
export declare class BowedTremolo extends Element {
    private readonly from;
    private readonly to;
    private readonly marks;
    private readonly beamWidth;
    private readonly levelDistance;
    constructor(from: StaveNote, to: StaveNote, marks: number, opts?: BowedTremoloOptions);
    crossStaffNotes(rowOf: ReadonlyMap<StaveNote, number>): StaveNote[];
    extendStems(): void;
    placeFermatas(): void;
    private fermatasOf;
    private headCenterX;
    private fermataBoundY;
    draw(): void;
    private sharesBeam;
    private anchorX;
    private sameStaffDirection;
    private headNearestBeam;
    private tipY;
    private sameDirectionLayout;
    private crossStaffLayout;
    private extendCrossStaffStems;
    private fitCrossStaffStem;
    private extendStemTo;
    private horizontalBounds;
    private drawSameDirection;
    private drawCrossStaff;
    private drawOpposing;
}
