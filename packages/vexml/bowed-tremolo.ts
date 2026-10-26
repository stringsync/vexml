import { Element, type RenderContext, type StaveNote } from 'vexflow/core';

/*
 * The slashes BETWEEN two notes of a <tremolo type="start"> ... <tremolo type="stop"> pair
 * (a fingered or bowed tremolo), each slash a short beam-like stroke centred between the two
 * stems. The single-note form is vexflow's Tremolo modifier, through one stem.
 */
export class BowedTremolo extends Element {
	constructor(
		private readonly from: StaveNote,
		private readonly to: StaveNote,
		private readonly marks: number,
	) {
		super();
	}

	override draw(): void {
		const ctx: RenderContext = this.checkContext();
		this.setRendered();
		// A pair split across systems has no gap to draw in.
		if (this.from.getStave() !== this.to.getStave()) {
			return;
		}
		const x1 = this.from.getStemX();
		const x2 = this.to.getStemX();
		if (!(x2 > x1) || !this.from.hasStem() || !this.to.hasStem()) {
			return;
		}
		const a = this.from.getStemExtents();
		const b = this.to.getStemExtents();
		const y1 = (a.topY + a.baseY) / 2;
		const y2 = (b.topY + b.baseY) / 2;
		const slope = (y2 - y1) / (x2 - x1);
		const width = Math.min((x2 - x1) * 0.5, 14);
		const left = (x1 + x2) / 2 - width / 2;
		const right = left + width;
		const midY = (y1 + y2) / 2;
		const thickness = 4;
		const pitch = thickness * 1.8;
		// A hair of rise keeps the strokes reading as slashes on a level pair.
		const rise = width * 0.25;
		const top = midY - ((this.marks - 1) * pitch) / 2;
		for (let i = 0; i < this.marks; i++) {
			const y = top + i * pitch;
			const yAt = (x: number) => y + slope * (x - (x1 + x2) / 2);
			ctx.beginPath();
			ctx.moveTo(left, yAt(left) + rise / 2);
			ctx.lineTo(left, yAt(left) + rise / 2 + thickness);
			ctx.lineTo(right, yAt(right) - rise / 2 + thickness);
			ctx.lineTo(right, yAt(right) - rise / 2);
			ctx.closePath();
			ctx.fill();
		}
	}
}
