import { Rect } from '../core/geometry/index.js';
import type { PaintOp } from './paint-op.js';
export interface GridOrigin {
    readonly x: number;
    readonly y: number;
}
export declare class TileGrid {
    readonly width: number;
    readonly height: number;
    readonly tileSize: number;
    readonly origin: GridOrigin;
    readonly cols: number;
    readonly rows: number;
    private readonly lists;
    private seq;
    constructor(width: number, height: number, tileSize: number, origin?: GridOrigin);
    get size(): number;
    grown(height: number): TileGrid;
    tileRect(index: number): Rect;
    tilesIn(region: Rect): number[];
    append(op: PaintOp): number[];
    ops(tile: number): PaintOp[];
    isEmpty(tile: number): boolean;
    opsIn(region: Rect): PaintOp[];
    clear(): void;
    private list;
    private cleared;
    private covers;
}
