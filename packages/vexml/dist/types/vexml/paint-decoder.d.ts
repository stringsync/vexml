import { type EncodedPaint, type PaintStream } from './paint-encoder.js';
import type { PaintOp } from './paint-op.js';
import type { SnapshotOutlines } from './score-snapshot.js';
import { TextOutline } from './text-outline.js';
export declare class PaintDecoder {
    private readonly tables;
    private readonly matrices;
    private readonly states;
    private readonly stateMatrices;
    private readonly outlines;
    constructor(tables: EncodedPaint, outlines?: SnapshotOutlines | null);
    decode(stream: PaintStream): PaintOp[];
    private path;
    private readOutlines;
    outline(font: string, text: string): TextOutline | undefined;
    private outlineOf;
    private matrix;
}
