import { Rect } from '../core/geometry/index.js';
export declare class Affine {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
    readonly e: number;
    readonly f: number;
    static readonly IDENTITY: Affine;
    constructor(a: number, b: number, c: number, d: number, e: number, f: number);
    static scale(sx: number, sy?: number): Affine;
    static translate(tx: number, ty: number): Affine;
    multiply(other: Affine): Affine;
    isEqual(other: Affine): boolean;
    get isAxisAligned(): boolean;
    get maxScale(): number;
    mapBox(x0: number, y0: number, x1: number, y1: number): Rect;
}
