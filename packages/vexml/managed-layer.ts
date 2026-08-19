import type { Layer, LayerKind } from './layer';
import type { Stage } from './stage';

/* The per-axis bitmap ceiling for overlay layers, in device px. GPUs commonly top out at 16384px
 * textures; a canvas past that on either axis falls back to software rasterization.
 * ponytail: hardcoded common limit, not queried from WebGL — probe MAX_TEXTURE_SIZE if a
 * platform under 16384 ever matters. */
const MAX_BITMAP_PX = 16384;

/*
 * A managed overlay canvas — the production Layer. Absolutely positioned over the base canvas, dpr
 * scaled so the caller's ctx draws in CSS pixels, and sized by its kind. Resizing resets the
 * bitmap (which clears it) and re-applies the dpr transform. Back-references its Stage only to
 * deregister on dispose (both live here and are disposed together).
 */
export class ManagedLayer implements Layer {
	readonly ctx: CanvasRenderingContext2D;

	constructor(
		readonly kind: LayerKind,
		private readonly canvas: HTMLCanvasElement,
		private readonly stage: Stage,
	) {
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('vexml: 2D context unavailable for layer');
		}
		this.ctx = ctx;
	}

	resize(cssWidth: number, cssHeight: number): void {
		const dpr = window.devicePixelRatio || 1;
		// Cap each bitmap axis at the common GPU max texture size. A content layer spans the whole
		// engraved score, and a long score at dpr 2 can exceed the cap — which silently drops the
		// canvas onto the software rasterization path, where every change costs tens of ms of buffer
		// churn per frame. Under the cap the layer stays GPU-composited; the axis renders at slightly
		// reduced resolution (overlays only — the engraving itself is untouched), which a translucent
		// halo, a recolored glyph, or a cursor bar wears invisibly.
		const sx = Math.min(dpr, cssWidth > 0 ? MAX_BITMAP_PX / cssWidth : dpr);
		const sy = Math.min(dpr, cssHeight > 0 ? MAX_BITMAP_PX / cssHeight : dpr);
		this.canvas.width = Math.max(0, Math.round(cssWidth * sx));
		this.canvas.height = Math.max(0, Math.round(cssHeight * sy));
		this.canvas.style.width = `${cssWidth}px`;
		this.canvas.style.height = `${cssHeight}px`;
		// Setting width/height cleared the bitmap and reset the transform; re-apply the scale so the
		// caller keeps drawing in CSS pixels. setTransform (not scale) stays idempotent on re-resize.
		this.ctx.setTransform(sx, 0, 0, sy, 0, 0);
	}

	// Position and stretch the element's on-screen box, independent of the bitmap resolution resize()
	// set. For a content layer this lets a fixed score-resolution bitmap be displayed at the base
	// canvas's (possibly CSS-scaled) rendered size, so the overlay tracks it without a clearing resize.
	place(left: number, top: number, width: number, height: number): void {
		this.canvas.style.left = `${left}px`;
		this.canvas.style.top = `${top}px`;
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
	}

	dispose(): void {
		this.canvas.remove();
		this.stage.forget(this);
	}
}
