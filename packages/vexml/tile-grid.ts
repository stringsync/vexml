import { Rect } from 'webappwiz/geometry';
import type { PaintOp } from './paint-op';

/* Where a grid's recorded ops sit relative to the surface: an engraving is recorded with headroom
 * above its first system that the surface crops off. */
export interface GridOrigin {
	readonly x: number;
	readonly y: number;
}

/*
 * A surface cut into square tiles, each with the ops that can touch it, in paint order. A tile
 * replays only its own list, so painting one tile of a long score costs that tile's share of the
 * score, not the score. A clear drops the ops it wholly covers from its tiles, so a layer its
 * caller clears and redraws stays as long as what is on it, not as long as its history.
 */
export class TileGrid {
	readonly cols: number;
	readonly rows: number;
	private readonly lists: Filed[][];
	private seq = 0;

	constructor(
		readonly width: number,
		readonly height: number,
		readonly tileSize: number,
		readonly origin: GridOrigin = { x: 0, y: 0 },
	) {
		this.cols = width > 0 ? Math.ceil(width / tileSize) : 0;
		this.rows = height > 0 ? Math.ceil(height / tileSize) : 0;
		this.lists = Array.from({ length: this.cols * this.rows }, () => []);
	}

	get size(): number {
		return this.lists.length;
	}

	/* The tile's box on the surface; edge tiles are cut short where the surface ends. */
	tileRect(index: number): Rect {
		const x = (index % this.cols) * this.tileSize;
		const y = Math.floor(index / this.cols) * this.tileSize;
		return new Rect(
			x,
			y,
			Math.min(this.tileSize, this.width - x),
			Math.min(this.tileSize, this.height - y),
		);
	}

	/* The tiles a surface-space region overlaps, row by row. */
	tilesIn(region: Rect): number[] {
		const x0 = Math.max(0, region.x);
		const y0 = Math.max(0, region.y);
		const x1 = Math.min(this.width, region.right);
		const y1 = Math.min(this.height, region.bottom);
		if (x1 <= x0 || y1 <= y0) {
			return [];
		}
		const T = this.tileSize;
		const tiles: number[] = [];
		for (let row = Math.floor(y0 / T); row <= Math.ceil(y1 / T) - 1; row++) {
			for (let col = Math.floor(x0 / T); col <= Math.ceil(x1 / T) - 1; col++) {
				tiles.push(row * this.cols + col);
			}
		}
		return tiles;
	}

	/* File an op under every tile it can touch; returns those tiles. */
	append(op: PaintOp): number[] {
		const tiles = op.bounds
			? this.tilesIn(op.bounds.translate(this.origin.x, this.origin.y))
			: this.lists.map((_, i) => i);
		const filed = { op, seq: this.seq++ };
		const cleared = op.call.kind === 'clearRect' ? this.cleared(op) : null;
		for (const tile of tiles) {
			let list = this.list(tile);
			if (cleared) {
				const rect = this.tileRect(tile);
				list = list.filter((f) => !this.covers(cleared, f.op, rect));
				this.lists[tile] = list;
				// A clear over the whole tile leaves nothing for a replay to clear.
				if (cleared.containsRect(rect)) {
					continue;
				}
			}
			list.push(filed);
		}
		return tiles;
	}

	ops(tile: number): PaintOp[] {
		return this.list(tile).map((f) => f.op);
	}

	isEmpty(tile: number): boolean {
		return this.list(tile).length === 0;
	}

	/* Every op that can touch a surface-space region, once each, in paint order. */
	opsIn(region: Rect): PaintOp[] {
		const seen = new Set<Filed>();
		for (const tile of this.tilesIn(region)) {
			for (const filed of this.list(tile)) {
				seen.add(filed);
			}
		}
		return [...seen].sort((a, b) => a.seq - b.seq).map((f) => f.op);
	}

	clear(): void {
		for (const list of this.lists) {
			list.length = 0;
		}
	}

	private list(tile: number): Filed[] {
		const list = this.lists[tile];
		if (!list) {
			throw new RangeError(`vexml: no tile ${tile}`);
		}
		return list;
	}

	// What a clear op certainly empties, in surface space, or null when that isn't a box: under a
	// rotation, or inside a clip that isn't a rectangle.
	private cleared(op: PaintOp): Rect | null {
		const { call, state } = op;
		if (call.kind !== 'clearRect' || !state.matrix.isAxisAligned) {
			return null;
		}
		let box: Rect | null = state.matrix.mapBox(
			call.x,
			call.y,
			call.x + call.w,
			call.y + call.h,
		);
		for (const clip of state.clips) {
			if (!clip.rect || !box) {
				return null;
			}
			box = box.intersection(clip.rect);
		}
		return box?.translate(this.origin.x, this.origin.y) ?? null;
	}

	// Whether a clear leaves nothing of an op inside one tile. Only the tile's part matters: the
	// op's pixels elsewhere live in other tiles' lists.
	private covers(cleared: Rect, op: PaintOp, tile: Rect): boolean {
		if (!op.bounds) {
			return false;
		}
		const part = op.bounds
			.translate(this.origin.x, this.origin.y)
			.intersection(tile);
		return !part || cleared.containsRect(part);
	}
}

interface Filed {
	readonly op: PaintOp;
	readonly seq: number;
}
