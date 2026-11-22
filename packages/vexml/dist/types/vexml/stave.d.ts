import { Rect } from '../core/geometry/index.js';
import type { RawKeyAccidental } from './geometry-collector.js';
export interface KeyAccidental {
    step: string;
    alter: number;
    rect: Rect;
}
export declare class Stave {
    private readonly number;
    private readonly lines;
    private readonly left;
    private readonly right;
    private readonly noteStartX;
    private readonly keyAccidentals;
    constructor(number: number, lines: readonly number[], left: number, right: number, noteStartX: number, keyAccidentals: readonly RawKeyAccidental[]);
    getNumber(): number;
    getLineYs(): number[];
    getRect(): Rect;
    getNoteStartX(): number;
    getKeyAccidentals(): KeyAccidental[];
}
