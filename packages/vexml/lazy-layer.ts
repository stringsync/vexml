import type { Layer, LayerKind } from './layer';
import type { LayerHost } from './layer-host';

/* A Layer whose canvas is made on the first draw. A content layer spans the whole engraved score,
 * so one that is never drawn on (the selection overlay while editing is off) would otherwise hold
 * a score-sized bitmap for nothing — on iOS that area comes out of WebKit's small GPU canvas
 * budget that playback also needs. */
export class LazyLayer implements Layer {
	private layer: Layer | null = null;

	constructor(
		private readonly host: LayerHost,
		private readonly kind: LayerKind,
		private readonly zIndex?: number,
	) {}

	get ctx(): CanvasRenderingContext2D {
		this.layer ??= this.host.createLayer(this.kind, this.zIndex);
		return this.layer.ctx;
	}

	dispose(): void {
		this.layer?.dispose();
		this.layer = null;
	}
}
