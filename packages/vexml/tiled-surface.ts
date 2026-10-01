import type { Resource } from 'webappwiz/disposable';
import { Rect } from 'webappwiz/geometry';
import { Affine } from './affine';
import { PaintContext } from './paint-context';
import type { PaintOp } from './paint-op';
import type { PaintProbe } from './paint-probe';
import { PaintReplayer } from './paint-replayer';
import type { PaintSink } from './paint-sink';
import { TileBudget } from './tile-budget';
import { type GridOrigin, TileGrid } from './tile-grid';

export interface TiledSurfaceOptions {
	// Device px per CSS px the tiles are painted at.
	scale: number;
	// A tile's side, in CSS px.
	tileSize: number;
	// Device px² of tiles kept painted (see TILE_BUDGET).
	budget: number;
}

/*
 * A score-sized drawing surface made of small canvases. A single canvas the size of a long score
 * goes blank: browsers cap a canvas per side (Chrome 65535px, Firefox 32767px) and in area
 * (Safari 16.7M px). Here the score's ops are filed by tile (TileGrid) and each tile is its own
 * canvas, painted at full device resolution. While every tile fits the budget they're all
 * painted; past it, only those in or near the view are, and the rest wait in their op lists.
 *
 * `ctx` records onto it: an op lands in the grid and is replayed at once onto any painted tile it
 * touches. The tiles sit on a plane laid out at the surface's CSS size, scaled by fit() to
 * whatever box the host is shown at.
 */
export class TiledSurface implements PaintSink, Resource {
	readonly ctx: CanvasRenderingContext2D;
	private readonly plane: HTMLDivElement;
	private readonly tiles = new Map<number, Tile>();
	private readonly budget: TileBudget<number>;
	private grid: TileGrid;
	// The region in or near view, in surface px; null until the stage first measures it.
	private view: Rect | null = null;
	private whole = true;

	constructor(
		readonly host: HTMLElement,
		probe: PaintProbe,
		private readonly opts: TiledSurfaceOptions,
	) {
		this.plane = document.createElement('div');
		this.plane.className = 'vexml-tiles';
		const style = this.plane.style;
		style.position = 'absolute';
		style.left = '0';
		style.top = '0';
		style.transformOrigin = '0 0';
		style.pointerEvents = 'none';
		host.appendChild(this.plane);
		this.budget = new TileBudget(opts.budget);
		this.grid = new TileGrid(0, 0, opts.tileSize);
		this.ctx = new PaintContext(
			this,
			probe,
			host,
		) as unknown as CanvasRenderingContext2D;
	}

	get scale(): number {
		return this.opts.scale;
	}

	get width(): number {
		return this.grid.width;
	}

	get height(): number {
		return this.grid.height;
	}

	/* How many tiles hold a painted canvas right now. */
	get painted(): number {
		return this.tiles.size;
	}

	/* Size the surface in CSS px, dropping everything drawn on it, as resizing a canvas does.
	 * `origin` is where recorded space's (0, 0) lands on the surface. */
	resize(width: number, height: number, origin?: GridOrigin): void {
		for (const tile of [...this.tiles.keys()]) {
			this.close(tile);
		}
		this.grid = new TileGrid(width, height, this.opts.tileSize, origin);
		this.plane.style.width = `${width}px`;
		this.plane.style.height = `${height}px`;
	}

	/* Replace everything with already recorded ops: the engraving, once its crop is known. */
	load(
		ops: readonly PaintOp[],
		width: number,
		height: number,
		origin: GridOrigin,
	): void {
		this.resize(width, height, origin);
		for (const op of ops) {
			this.grid.append(op);
		}
		this.refresh();
	}

	/* Stretch the tiles over the box the host is shown at, in CSS px. */
	fit(width: number, height: number): void {
		// A box at full size can come back a rounding error off (a height derived from
		// aspect-ratio), and any scale at all has the compositor resample every tile.
		const sx = scaleOf(width, this.width);
		const sy = scaleOf(height, this.height);
		this.plane.style.transform =
			sx === 1 && sy === 1 ? '' : `scale(${sx}, ${sy})`;
	}

	/* Paint the tiles a surface-px region needs and let the budget drop the others. */
	show(view: Rect): void {
		this.view = view;
		this.refresh();
	}

	paint(op: PaintOp): void {
		let opened = false;
		for (const index of this.grid.append(op)) {
			const tile = this.tiles.get(index);
			if (tile) {
				tile.replayer.replay(op);
			} else if (this.wants(index)) {
				this.open(index);
				opened = true;
			}
		}
		// Drawing over a part that was blank can tip a surface painted whole past its budget.
		if (opened && this.budget.used > this.budget.limit) {
			this.refresh();
		}
	}

	read(sx: number, sy: number, sw: number, sh: number): ImageData {
		const canvas = document.createElement('canvas');
		canvas.width = sw;
		canvas.height = sh;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('vexml: 2D context unavailable');
		}
		const s = this.scale;
		const base = Affine.translate(-sx, -sy)
			.multiply(Affine.scale(s))
			.multiply(Affine.translate(this.grid.origin.x, this.grid.origin.y));
		const replayer = new PaintReplayer(ctx, base, {
			scale: s,
			device: { x: sx, y: sy },
		});
		for (const op of this.grid.opsIn(
			new Rect(sx / s, sy / s, sw / s, sh / s),
		)) {
			replayer.replay(op);
		}
		replayer.finish();
		const data = ctx.getImageData(0, 0, sw, sh);
		canvas.width = 0;
		canvas.height = 0;
		return data;
	}

	reset(): void {
		for (const tile of [...this.tiles.keys()]) {
			this.close(tile);
		}
		this.grid.clear();
	}

	/* Paint a surface-px region into a context whose transform already maps surface px to its
	 * pixels: straight from the ops, so a magnified view stays sharp. */
	paintInto(ctx: CanvasRenderingContext2D, region: Rect): void {
		const t = ctx.getTransform();
		const base = new Affine(t.a, t.b, t.c, t.d, t.e, t.f).multiply(
			Affine.translate(this.grid.origin.x, this.grid.origin.y),
		);
		ctx.save();
		ctx.beginPath();
		ctx.rect(region.x, region.y, region.w, region.h);
		ctx.clip();
		const replayer = new PaintReplayer(ctx, base, {
			scale: this.scale,
			device: null,
		});
		for (const op of this.grid.opsIn(region)) {
			replayer.replay(op);
		}
		replayer.finish();
		ctx.restore();
	}

	dispose(): void {
		this.reset();
		this.plane.remove();
	}

	private refresh(): void {
		const filled: number[] = [];
		let area = 0;
		for (let index = 0; index < this.grid.size; index++) {
			if (!this.grid.isEmpty(index)) {
				filled.push(index);
				area += this.areaOf(index);
			}
		}
		this.whole = area <= this.budget.limit;
		const wanted = filled.filter((index) => this.wants(index));
		for (const index of wanted) {
			if (this.tiles.has(index)) {
				this.budget.use(index, this.areaOf(index));
			} else {
				this.open(index);
			}
		}
		for (const index of this.budget.trim(new Set(wanted))) {
			this.close(index);
		}
	}

	private wants(index: number): boolean {
		if (this.grid.isEmpty(index)) {
			return false;
		}
		if (this.whole) {
			return true;
		}
		return this.view?.intersects(this.grid.tileRect(index)) ?? false;
	}

	private open(index: number): void {
		const rect = this.grid.tileRect(index);
		const s = this.scale;
		// Snap the tile's edges to device pixels so neighbours meet without a seam or overlap.
		const x0 = Math.round(rect.x * s);
		const y0 = Math.round(rect.y * s);
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(rect.right * s) - x0;
		canvas.height = Math.round(rect.bottom * s) - y0;
		const style = canvas.style;
		style.position = 'absolute';
		style.display = 'block';
		style.left = `${x0 / s}px`;
		style.top = `${y0 / s}px`;
		style.width = `${canvas.width / s}px`;
		style.height = `${canvas.height / s}px`;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('vexml: 2D context unavailable for a tile');
		}
		const base = new Affine(s, 0, 0, s, -x0, -y0).multiply(
			Affine.translate(this.grid.origin.x, this.grid.origin.y),
		);
		const replayer = new PaintReplayer(ctx, base, {
			scale: s,
			device: { x: x0, y: y0 },
		});
		for (const op of this.grid.ops(index)) {
			replayer.replay(op);
		}
		this.plane.appendChild(canvas);
		this.tiles.set(index, { canvas, replayer });
		this.budget.use(index, canvas.width * canvas.height);
	}

	private close(index: number): void {
		const tile = this.tiles.get(index);
		if (!tile) {
			return;
		}
		tile.canvas.remove();
		// Free the bitmap now, not at the next GC: iOS WebKit counts a dropped canvas against its
		// memory limit until it's collected.
		tile.canvas.width = 0;
		tile.canvas.height = 0;
		this.tiles.delete(index);
		this.budget.drop(index);
	}

	private areaOf(index: number): number {
		const rect = this.grid.tileRect(index);
		return Math.round(rect.w * this.scale) * Math.round(rect.h * this.scale);
	}
}

interface Tile {
	readonly canvas: HTMLCanvasElement;
	readonly replayer: PaintReplayer;
}

// Relative. Chrome lays out a height from aspect-ratio a little off, more the longer the score
// (half a px on a 25000px one), and stretching the tiles to close that gap would resample every
// one of them and make the plane a composited layer, which Chrome won't raster much past 8000px
// in a capture. A real fit to a narrower box scales by far more.
const FIT_TOLERANCE = 1e-4;

function scaleOf(shown: number, intrinsic: number): number {
	return intrinsic <= 0 || Math.abs(shown / intrinsic - 1) < FIT_TOLERANCE
		? 1
		: shown / intrinsic;
}
