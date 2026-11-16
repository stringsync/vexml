import type { Layer, LayerKind } from './layer.js';
import type { Stage } from './stage.js';
export declare class ManagedLayer implements Layer {
    readonly kind: LayerKind;
    readonly canvas: HTMLCanvasElement;
    private readonly stage;
    readonly zIndex: number;
    readonly order: number;
    readonly ctx: CanvasRenderingContext2D;
    constructor(kind: LayerKind, canvas: HTMLCanvasElement, stage: Stage, zIndex: number, order: number);
    resize(cssWidth: number, cssHeight: number): void;
    place(left: number, top: number, width: number, height: number): void;
    dispose(): void;
}
