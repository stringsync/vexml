import type { Layer, LayerKind } from './layer.js';
export interface LayerHost {
    createLayer(kind: LayerKind, zIndex?: number): Layer;
}
