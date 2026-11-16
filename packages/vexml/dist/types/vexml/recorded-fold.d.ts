import type { Fold } from './fold.js';
import type { PaintOp } from './paint-op.js';
export declare class RecordedFold implements Fold {
    readonly left: number;
    readonly width: number;
    readonly height: number;
    readonly starts: readonly number[];
    private readonly strips;
    constructor(left: number, width: number, height: number, starts: readonly number[], strips: ReadonlyArray<readonly PaintOp[]>);
    indexAt(x: number): number;
    paint(context: CanvasRenderingContext2D, index: number): void;
}
