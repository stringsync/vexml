import type { Layer, LayerKind } from './layer.js';
import type { TiledSurface } from './tiled-surface.js';
export interface TiledLayerOwner {
    forget(layer: TiledLayer): void;
}
export declare class TiledLayer implements Layer {
    readonly kind: LayerKind;
    readonly element: HTMLDivElement;
    readonly surface: TiledSurface;
    readonly ctx: CanvasRenderingContext2D;
    private readonly owner;
    readonly zIndex: number;
    readonly order: number;
    constructor(kind: LayerKind, element: HTMLDivElement, surface: TiledSurface, ctx: CanvasRenderingContext2D, owner: TiledLayerOwner, zIndex: number, order: number);
    place(left: number, top: number, width: number, height: number): void;
    dispose(): void;
}
