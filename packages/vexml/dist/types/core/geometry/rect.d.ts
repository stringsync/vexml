import type { Position } from "./position.js";
/**
 * An axis-aligned rectangle, positioned at its top left corner. y grows
 * downward, the convention every browser API uses, so `top` is the smaller y
 * and `bottom` the larger.
 *
 * Rectangles are values: every operation returns a new one, so a rect handed to
 * a collision index or a layout cache cannot move under it.
 */
export declare class Rect {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    constructor(x: number, y: number, w: number, h: number);
    static zero(): Rect;
    /** A rect from anything shaped like a `DOMRect`, such as `getBoundingClientRect()`. */
    static fromDomRect(rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): Rect;
    get top(): number;
    get left(): number;
    get right(): number;
    get bottom(): number;
    get area(): number;
    isEqual(other: Rect): boolean;
    /** Whether the point lies within this rect, edges included. */
    contains(position: Position): boolean;
    /** Whether `other` lies entirely within this rect, edges included. */
    containsRect(other: Rect): boolean;
    /**
     * Whether the two rects overlap on a positive area. Two rects that merely
     * share an edge do not intersect: an overlap of zero is not an overlap, and
     * counting it as one means nudging things apart by 0px forever.
     */
    intersects(other: Rect): boolean;
    /** The overlapping region of the two rects, or null when they do not intersect. */
    intersection(other: Rect): Rect | null;
    /** The smallest rect holding both. */
    union(other: Rect): Rect;
    /** A copy shifted by (dx, dy). */
    translate(dx: number, dy: number): Rect;
    /** A copy of the same size, moved to the origin. */
    atOrigin(): Rect;
}
