import type { Layer, LayerKind } from './layer';

/* The minimal seam for making a drawing layer — what Decorations needs from the stage (it draws
 * on its own content layer but needs nothing else). Stage satisfies it; a unit test injects a
 * fake whose layer carries a recording context. */
export interface LayerHost {
	createLayer(kind: LayerKind, zIndex?: number): Layer;
}
