import type { PaintOp } from './paint-op';

/* Where a PaintContext's recorded ops go: a buffer while the engraving is drawn, a tiled surface
 * for a layer the caller paints live. */
export interface PaintSink {
	// Device pixels per CSS pixel of the virtual full-size bitmap: what putImageData and
	// getImageData coordinates are measured in.
	readonly scale: number;
	paint(op: PaintOp): void;
	read(sx: number, sy: number, sw: number, sh: number): ImageData;
	// Drop everything painted so far, as resetting a canvas does.
	reset(): void;
}
