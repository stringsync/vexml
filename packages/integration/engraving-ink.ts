/*
 * Ink for the Behind Bars engraving checks (ENGRAVING.md). Stems, flags, beams, ledger
 * lines and the like have no element in vexml's API, so the checks read them from the
 * render's ink masks: one per drawn element, tagged with the kind vexflow drew it as.
 * Positions are in score pixels, where a stave-space is the gap between two stave lines
 * (10px at the default size).
 */

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface RawMask {
	kind: string;
	x: number;
	y: number;
	width: number;
	runs: number[];
}

/** A mask's ink, with its tight box: the mask's own box is padded. */
export class Ink {
	readonly box: Box;
	private readonly rows = new Map<number, number[]>();

	constructor(readonly mask: RawMask) {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		const { width, runs } = mask;
		// Runs are [offset, length] pairs over the mask's row-major bitmap.
		for (let i = 0; i < runs.length; i += 2) {
			let offset = runs[i] ?? 0;
			let length = runs[i + 1] ?? 0;
			while (length > 0) {
				const row = Math.floor(offset / width);
				const col = offset % width;
				const take = Math.min(length, width - col);
				const y = mask.y + row;
				const xs = this.rows.get(y) ?? [];
				for (let k = 0; k < take; k++) {
					xs.push(mask.x + col + k);
				}
				this.rows.set(y, xs);
				minX = Math.min(minX, mask.x + col);
				maxX = Math.max(maxX, mask.x + col + take);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y + 1);
				offset += take;
				length -= take;
			}
		}
		this.box =
			minX === Infinity
				? { x: mask.x, y: mask.y, w: 0, h: 0 }
				: { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
	}

	get kind(): string {
		return this.mask.kind;
	}

	has(x: number, y: number): boolean {
		return this.rows.get(y)?.includes(x) ?? false;
	}

	/** Rows with ink in column x, grouped into contiguous bands [top, bottom). */
	bandsAt(x: number): [number, number][] {
		const ys = [...this.rows.entries()]
			.filter(([, xs]) => xs.includes(x))
			.map(([y]) => y)
			.sort((a, b) => a - b);
		const bands: [number, number][] = [];
		for (const y of ys) {
			const last = bands[bands.length - 1];
			if (last && last[1] === y) {
				last[1] = y + 1;
			} else {
				bands.push([y, y + 1]);
			}
		}
		return bands;
	}

	/** Horizontal segments in row y as [left, right). */
	segmentsAt(y: number): [number, number][] {
		const xs = [...(this.rows.get(y) ?? [])].sort((a, b) => a - b);
		const segments: [number, number][] = [];
		for (const x of xs) {
			const last = segments[segments.length - 1];
			if (last && last[1] === x) {
				last[1] = x + 1;
			} else {
				segments.push([x, x + 1]);
			}
		}
		return segments;
	}

	/** How many pixels it inks. */
	count(): number {
		let n = 0;
		for (const xs of this.rows.values()) {
			n += xs.length;
		}
		return n;
	}

	/** Rows with ink, ascending. */
	rowYs(): number[] {
		return [...this.rows.keys()].sort((a, b) => a - b);
	}

	/** The same ink moved by (dx, dy). */
	moved(dx: number, dy: number): Ink {
		return new Ink({ ...this.mask, x: this.mask.x + dx, y: this.mask.y + dy });
	}

	/** Pixels where this ink and other both draw. */
	overlaps(other: Ink): number {
		let shared = 0;
		for (const [y, xs] of this.rows) {
			for (const x of xs) {
				if (other.has(x, y)) {
					shared++;
				}
			}
		}
		return shared;
	}
}
