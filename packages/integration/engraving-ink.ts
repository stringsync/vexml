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
				minX = Math.min(minX, mask.x + col);
				maxX = Math.max(maxX, mask.x + col + take);
				minY = Math.min(minY, mask.y + row);
				maxY = Math.max(maxY, mask.y + row + 1);
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

	/** The same ink moved by (dx, dy). */
	moved(dx: number, dy: number): Ink {
		return new Ink({ ...this.mask, x: this.mask.x + dx, y: this.mask.y + dy });
	}
}
