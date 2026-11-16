import type { PaintOp } from './paint-op.js';
import type { PaintSink } from './paint-sink.js';
export interface PaintListMark {
    ops: number;
    groups: number;
    nextElement: number;
}
export declare class PaintList implements PaintSink {
    readonly scale = 1;
    readonly ops: PaintOp[];
    private readonly groups;
    private nextElement;
    /** Attribute subsequent ops to this notation identity until closeGroup() is called. */
    openGroup(kind: string): undefined;
    closeGroup(): void;
    paint(op: PaintOp): void;
    read(): ImageData;
    mark(): PaintListMark;
    rewind(mark: PaintListMark): void;
    reset(): void;
}
