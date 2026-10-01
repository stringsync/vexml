import type { Rect } from 'webappwiz/geometry';
import { MAX_CANVAS_AREA } from './constants';
import type { PagePainter } from './page-painter';
import type { System } from './system';

/*
 * One page of a score rendered with a paged layout: its box in score space and the systems on it.
 * toBlob draws it on a canvas of its own, at the score's pixelRatio, so a long score prints every
 * page sharp — the canvas size cap applies to a page, not the whole score. What it draws is the
 * engraving on opaque paper, margins included; caller layers, markers and cursors are left off.
 */
export class Page {
	constructor(
		private readonly index: number,
		/** The page's box in score space: pageWidth × pageHeight, margins included. */
		readonly rect: Rect,
		private readonly systems: readonly System[],
		private readonly painter: PagePainter,
	) {}

	/** The 0-based page number, top to bottom. */
	getIndex(): number {
		return this.index;
	}

	/** The systems that start on this page, top to bottom. */
	getSystems(): System[] {
		return [...this.systems];
	}

	/** The page as an image (default `'image/png'`; `quality` is for lossy types, as
	 * `HTMLCanvasElement.toBlob`). Drawn when called, so the score can be disposed before the
	 * promise settles. */
	toBlob(type = 'image/png', quality?: number): Promise<Blob> {
		const canvas = this.toCanvas();
		return new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) => {
					// Free the bitmap now, not at the next GC: a long score exports many pages.
					canvas.width = 0;
					canvas.height = 0;
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error(`vexml: could not encode page ${this.index}`));
					}
				},
				type,
				quality,
			);
		});
	}

	/** The page drawn on a fresh canvas the caller owns, `pixelRatio` device px per CSS px (less
	 * if a page that size would pass the browser's canvas area cap). */
	toCanvas(): HTMLCanvasElement {
		const { x, y, w, h } = this.rect;
		const scale = Math.min(
			this.painter.pixelRatio,
			Math.sqrt(MAX_CANVAS_AREA / (w * h)),
		);
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(w * scale);
		canvas.height = Math.round(h * scale);
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('vexml: 2D context unavailable for a page');
		}
		// White under the paper, so a translucent background still prints opaque.
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = this.painter.paperColor();
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		const sx = canvas.width / w;
		const sy = canvas.height / h;
		ctx.setTransform(sx, 0, 0, sy, -x * sx, -y * sy);
		this.painter.paintEngraving(ctx, this.rect, scale);
		return canvas;
	}
}
