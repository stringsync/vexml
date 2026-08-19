import type { Resource } from 'webappwiz/disposable';

/* Where a custom drawing layer sits. A `content` layer covers the whole engraved score (score
 * space, scrolls with the content) — what decorations draw on. A `background` layer is a content
 * layer placed *behind* the base canvas (z-index -1), so it shows through the score's transparent
 * pixels — e.g. a halo glowing behind the noteheads. A `viewport` layer covers only the visible box
 * (client space) and is resized as the container resizes. */
export type LayerKind = 'content' | 'background' | 'viewport';

/* A caller-owned drawing surface stacked over the score. Only the 2D context is exposed — never
 * the canvas, its size, or a clear — so the layer's lifecycle stays vexml's. The caller draws via
 * ctx (CSS pixels; the dpr scale is applied for them) and removes the layer with dispose(). */
export interface Layer extends Resource {
	readonly ctx: CanvasRenderingContext2D;
}
