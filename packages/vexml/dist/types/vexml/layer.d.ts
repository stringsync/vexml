import type { Resource } from '../core/disposable/index.js';
export type LayerKind = 'content' | 'background' | 'viewport';
export interface Layer extends Resource {
    readonly ctx: CanvasRenderingContext2D;
}
