import type { Marker, MarkerOptions, MarkerRect } from './marker.js';
import type { Stage } from './stage.js';
export interface MarkerFrame {
    left: number;
    top: number;
    sx: number;
    sy: number;
}
export declare class ManagedMarker implements Marker {
    private readonly el;
    private frame;
    private readonly stage;
    readonly zIndex: number;
    readonly order: number;
    private rect;
    private color;
    private radius;
    private size;
    private corners;
    constructor(el: HTMLDivElement, frame: MarkerFrame, stage: Stage, zIndex: number, order: number);
    show(rect: MarkerRect, color: string, opts?: MarkerOptions): void;
    hide(): void;
    relayout(frame: MarkerFrame): void;
    paint(ctx: CanvasRenderingContext2D): void;
    dispose(): void;
    private apply;
}
