import type { Note } from '@stringsync/mdom';
import { type Stave, type StaveNote } from 'vexflow/core';
import type { SlurConnector } from './curve-connectors.js';
import { DisplayTuplet } from './display-tuplet.js';
import { SlurBow, type SlurBowOptions } from './slur-bow.js';
import type { SlurObstaclePoint, SlurShape } from './slur-shape.js';
export type SlurCandidate = {
    from: StaveNote;
    to: StaveNote;
    lead: Note;
    partner: Note;
    slur: SlurConnector;
    isGrace: boolean;
    span: StaveNote[];
    fromStave: Stave | undefined;
    toStave: Stave | undefined;
    crossStave: boolean;
    bulgeUp: boolean;
    mayGhost: boolean;
    ghost: boolean;
    wraps: boolean;
    width: number;
};
export type PlacedArc = {
    rowY: number;
    bulgeUp: boolean;
    from: StaveNote | undefined;
    to: StaveNote | undefined;
    xL: number;
    xR: number;
    yL: number;
    yR: number;
    shape: SlurShape;
    dir: number;
};
export declare class SlurNesting {
    private readonly placed;
    record(arc: PlacedArc): void;
    overlapping(rowY: number, bulgeUp: boolean, xL: number, xR: number): PlacedArc[];
    endLift(over: readonly PlacedArc[], note: StaveNote, isStart: boolean, baseEndY: number, dir: number): number;
    liftBow(bow: SlurBow, fromOver: readonly PlacedArc[], toOver: readonly PlacedArc[], fromTuplets: readonly DisplayTuplet[], toTuplets: readonly DisplayTuplet[], opts: SlurBowOptions): SlurBow;
    shorterTuplets(span: readonly StaveNote[], rowY: number, bulgeUp: boolean, xL: number, xR: number): DisplayTuplet[];
    tupletEndLift(tuplets: readonly DisplayTuplet[], note: StaveNote, bulgeUp: boolean, baseEndY: number, dir: number): number;
    tupletObstacles(tuplets: readonly DisplayTuplet[], bulgeUp: boolean, dir: number, xL: number, xR: number): SlurObstaclePoint[];
    obstacles(over: readonly PlacedArc[], xL: number, xR: number): SlurObstaclePoint[];
}
