import { Affine } from './affine.js';
import { Ink } from './ink.js';
import type { PaintOp } from './paint-op.js';
export interface ReplayTarget {
    readonly scale: number;
    readonly device: {
        readonly x: number;
        readonly y: number;
    } | null;
}
export type PaintReplayerOptions = {
    /** The colors the recording's ink roles paint in. */
    ink?: Ink;
};
export declare class PaintReplayer {
    private readonly ctx;
    private readonly base;
    private readonly target;
    private applied;
    private props;
    private clips;
    private dash;
    private matrix;
    private started;
    private readonly ink;
    constructor(ctx: CanvasRenderingContext2D, base: Affine, target: ReplayTarget, opts?: PaintReplayerOptions);
    replay(op: PaintOp): void;
    finish(): void;
    private apply;
    private trace;
    private transform;
    private put;
}
