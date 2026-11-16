import { Rect } from '../core/geometry/index.js';
export declare class Stave {
    private readonly number;
    private readonly lines;
    private readonly left;
    private readonly right;
    private readonly noteStartX;
    constructor(number: number, lines: readonly number[], left: number, right: number, noteStartX: number);
    getNumber(): number;
    getLineYs(): number[];
    getRect(): Rect;
    getNoteStartX(): number;
}
