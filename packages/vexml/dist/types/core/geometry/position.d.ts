/**
 * A point in a 2D space. Positions are values: every operation returns a new
 * one, so passing one around cannot change it under the caller.
 */
export declare class Position {
    readonly x: number;
    readonly y: number;
    constructor(x: number, y: number);
    static origin(): Position;
    /** Where an event happened, in viewport coordinates. */
    static fromEvent(event: {
        clientX: number;
        clientY: number;
    }): Position;
    isEqual(other: Position): boolean;
    /** The same point measured from another, e.g. an element's top left corner. */
    relativeTo(origin: {
        x: number;
        y: number;
    }): Position;
    translate(dx: number, dy: number): Position;
}
