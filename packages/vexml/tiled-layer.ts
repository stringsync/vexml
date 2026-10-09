import type { Layer, LayerKind } from './layer';
import type { TiledSurface } from './tiled-surface';

/* Where a TiledLayer reports its disposal: the stage that tracks it. */
export interface TiledLayerOwner {
	forget(layer: TiledLayer): void;
}

/*
 * A content or background layer: a tiled surface spanning the engraved score, so a caller draws
 * on a long score at full resolution just as on a short one. Its ctx records each call and
 * replays it onto the tiles it touches (see TiledSurface). The element is absolutely positioned
 * over the engraving and stretched to its rendered box by place().
 */
export class TiledLayer implements Layer {
	constructor(
		readonly kind: LayerKind,
		readonly element: HTMLDivElement,
		readonly surface: TiledSurface,
		// Records onto the surface.
		readonly ctx: CanvasRenderingContext2D,
		private readonly owner: TiledLayerOwner,
		// Where the layer stacks: its effective z-index and its creation (DOM) order among the
		// stage's overlays. A loupe paints overlays in the same order.
		readonly zIndex: number,
		readonly order: number,
	) {}

	place(left: number, top: number, width: number, height: number): void {
		const style = this.element.style;
		style.left = `${left}px`;
		style.top = `${top}px`;
		style.width = `${width}px`;
		style.height = `${height}px`;
		this.surface.fit(width, height);
	}

	dispose(): void {
		this.surface.dispose();
		this.element.remove();
		this.owner.forget(this);
	}
}
