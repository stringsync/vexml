import type { Layer, LayerKind } from './layer.js';
import type { LayerHost } from './layer-host.js';
export declare class LazyLayer implements Layer {
    private readonly host;
    private readonly kind;
    private readonly zIndex?;
    private layer;
    constructor(host: LayerHost, kind: LayerKind, zIndex?: number | undefined);
    get ctx(): CanvasRenderingContext2D;
    dispose(): void;
}
