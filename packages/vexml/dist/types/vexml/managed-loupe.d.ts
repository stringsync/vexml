import { type Loupe, type LoupeOptions } from './loupe.js';
import type { MarkerRect } from './marker.js';
import type { Stage } from './stage.js';
export declare class ManagedLoupe implements Loupe {
    private readonly canvas;
    private readonly stage;
    private opts;
    private readonly ctx;
    private dpr;
    private paper;
    private shown;
    private frame;
    private exit;
    constructor(canvas: HTMLCanvasElement, stage: Stage, opts: Required<LoupeOptions>);
    show(anchor: MarkerRect, at?: {
        x: number;
        y: number;
    }): void;
    hide(): void;
    configure(opts: LoupeOptions): void;
    dispose(): void;
    private paint;
    private animate;
    private open;
    private close;
    private style;
}
