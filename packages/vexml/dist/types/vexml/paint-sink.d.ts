import type { PaintOp } from './paint-op.js';
export interface PaintSink {
    readonly scale: number;
    paint(op: PaintOp): void;
    read(sx: number, sy: number, sw: number, sh: number): ImageData;
    reset(): void;
}
