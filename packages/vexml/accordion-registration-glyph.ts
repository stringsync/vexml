import type { RenderContext } from 'vexflow/core';

/*
 * An <accordion-registration> sign: SMuFL's three-rank register circle (accdnCombRH3RanksEmpty,
 * a ring cut into three bands by two chords) with a dot in each band whose reeds sound: one
 * in the high band, one in the low, and one to three side by side in the middle. Stroked on
 * the context rather than typed from the font: SMuFL's combining dot has no fixed place in
 * the ring, so the font alone cannot say where each dot goes.
 */
export class AccordionRegistrationGlyph {
	constructor(
		private readonly ranks: { high: boolean; middle: number; low: boolean },
		private readonly diameter: number,
	) {}

	/* Draw the sign in the square whose top-left corner is (x, y), `diameter` on a side. */
	draw(context: RenderContext, x: number, y: number): void {
		const r = this.diameter / 2;
		const cx = x + r;
		const cy = y + r;
		// The two chords sit a third of the diameter apart, splitting it into equal bands.
		const band = this.diameter / 3;
		const chordHalf = Math.sqrt(r * r - (band / 2) ** 2);
		const dot = this.diameter * DOT_RATIO;
		context.save();
		context.setLineWidth(Math.max(1, this.diameter * LINE_RATIO));
		context.beginPath();
		context.arc(cx, cy, r, 0, Math.PI * 2, false);
		context.stroke();
		context.beginPath();
		for (const dy of [-band / 2, band / 2]) {
			context.moveTo(cx - chordHalf, cy + dy);
			context.lineTo(cx + chordHalf, cy + dy);
		}
		context.stroke();
		const dots: [number, number][] = [];
		if (this.ranks.high) {
			dots.push([cx, cy - band]);
		}
		const middle = Math.min(3, this.ranks.middle);
		for (let i = 0; i < middle; i++) {
			dots.push([cx + (i - (middle - 1) / 2) * dot * 3, cy]);
		}
		if (this.ranks.low) {
			dots.push([cx, cy + band]);
		}
		for (const [dx, dy] of dots) {
			context.beginPath();
			context.arc(dx, dy, dot, 0, Math.PI * 2, false);
			context.fill();
		}
		context.restore();
	}
}

// A dot's radius, and the ring's stroke, as fractions of the ring's diameter: three dots
// three radii apart fit across the middle band with air at either end.
const DOT_RATIO = 0.09;
const LINE_RATIO = 0.06;
