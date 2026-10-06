import { MAX_CANVAS_AREA } from './constants';
import type { Layer, LayerKind } from './layer';
import type { Stage } from './stage';

/* The per-axis bitmap ceiling for overlay layers, in device px. GPUs commonly top out at 16384px
 * textures; a canvas past that on either axis falls back to software rasterization.
 * ponytail: hardcoded common limit, not queried from WebGL; probe MAX_TEXTURE_SIZE if a
 * platform under 16384 ever matters. */
const MAX_BITMAP_PX = 16384;

/*
 * A viewport layer: one overlay canvas the size of the visible box, absolutely positioned over the
 * score and dpr scaled so the caller's ctx draws in CSS pixels. (Content and background layers span
 * the score, which one canvas can't hold; they're TiledLayers.) Resizing resets the bitmap (which
 * clears it) and re-applies the dpr transform. Back-references its Stage only to deregister on
 * dispose (both live here and are disposed together).
 */
export class ManagedLayer implements Layer {
	readonly ctx: CanvasRenderingContext2D;

	constructor(
		readonly kind: LayerKind,
		// Never handed to callers: they get the ctx.
		readonly canvas: HTMLCanvasElement,
		private readonly stage: Stage,
		// Where the layer stacks: its effective z-index and its creation (DOM) order among the
		// stage's overlays.
		readonly zIndex: number,
		readonly order: number,
	) {
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('vexml: 2D context unavailable for layer');
		}
		this.ctx = ctx;
	}

	resize(cssWidth: number, cssHeight: number): void {
		const dpr = this.stage.pixelRatio;
		// Cap each bitmap axis at the common GPU max texture size. A caller's scroll box can be huge,
		// and a canvas past the cap silently drops onto the software rasterization path, where every
		// change costs tens of ms of buffer churn per frame. Under the cap the layer stays
		// GPU-composited at slightly reduced resolution.
		const area = cssWidth * cssHeight;
		const scale = Math.min(
			dpr,
			area > 0 ? Math.sqrt(MAX_CANVAS_AREA / area) : dpr,
		);
		const sx = Math.min(scale, cssWidth > 0 ? MAX_BITMAP_PX / cssWidth : dpr);
		const sy = Math.min(scale, cssHeight > 0 ? MAX_BITMAP_PX / cssHeight : dpr);
		this.canvas.width = Math.max(0, Math.round(cssWidth * sx));
		this.canvas.height = Math.max(0, Math.round(cssHeight * sy));
		this.canvas.style.width = `${cssWidth}px`;
		this.canvas.style.height = `${cssHeight}px`;
		// Setting width/height cleared the bitmap and reset the transform; re-apply the scale so the
		// caller keeps drawing in CSS pixels. setTransform (not scale) stays idempotent on re-resize.
		this.ctx.setTransform(sx, 0, 0, sy, 0, 0);
	}

	// Position and stretch the element's on-screen box, independent of the bitmap resolution resize()
	// set.
	place(left: number, top: number, width: number, height: number): void {
		this.canvas.style.left = `${left}px`;
		this.canvas.style.top = `${top}px`;
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
	}

	dispose(): void {
		this.canvas.remove();
		// Free the bitmap now rather than at the next GC (see Stage.dispose).
		this.canvas.width = 0;
		this.canvas.height = 0;
		this.stage.forget(this);
	}
}
