import { Rect } from 'core/geometry';
import {
	Barline,
	type RenderContext,
	type Stave,
	StaveModifierPosition,
} from 'vexflow/core';
import type { Winged } from './score-reader';

/** Which way a repeat sign's dots face from its thick line: +1 right (an opening repeat),
 * -1 left (a closing one). Its wings reach the same way, over the repeated music. */
type Facing = 1 | -1;

/** How far a wing climbs off the outer staff line, in staff spaces. */
const WING_RISE = 1.5;

/** How far a wing reaches across from its line, in staff spaces. */
const WING_REACH = 1.1;

/*
 * Draws the wings of a winged repeat sign (`<repeat winged>`): extensions above the system's
 * top staff line and below its bottom one, reaching from the sign's thick line over the
 * dots toward the repeated music. A double wing adds a second from the thin line. Painted
 * straight onto the canvas once the staves are on it, like the bar styles vexflow can't
 * draw, at the x vexflow drew the repeat sign itself.
 */
export class RepeatWingDrawer {
	constructor(private readonly context: RenderContext) {}

	/*
	 * The wings for one measure column. `top` and `bottom` are the system's outer staves at the
	 * column; `begin` wings the column's opening repeat, `end` its closing one, and `reopen` the
	 * next measure's opening repeat when it shares this measure's closing line. Returns the
	 * box of each wing drawn, for the caller to register as an obstacle.
	 */
	draw(
		top: Stave,
		bottom: Stave,
		wings: { begin: Winged; end: Winged; reopen: Winged },
	): Rect[] {
		this.context.openGroup('vexml-repeat-wing');
		try {
			const begin = this.repeatX(top, StaveModifierPosition.BEGIN, [
				Barline.type.REPEAT_BEGIN,
			]);
			const end = this.repeatX(top, StaveModifierPosition.END, [
				Barline.type.REPEAT_END,
				Barline.type.REPEAT_BOTH,
			]);
			const boxes: Rect[] = [];
			if (begin !== null) {
				boxes.push(...this.drawSign(top, bottom, begin, 1, wings.begin));
			}
			if (end !== null) {
				boxes.push(...this.drawSign(top, bottom, end, -1, wings.end));
				boxes.push(...this.drawSign(top, bottom, end, 1, wings.reopen));
			}
			return boxes;
		} finally {
			this.context.closeGroup();
		}
	}

	/* The x vexflow drew a repeat barline of one of `types` at, or null when there is none. */
	private repeatX(
		stave: Stave,
		position: number,
		types: number[],
	): number | null {
		const barline = stave
			.getModifiers(position)
			.find(
				(modifier) =>
					modifier instanceof Barline && types.includes(modifier.getType()),
			);
		return barline ? barline.getX() : null;
	}

	/*
	 * One repeat sign's wings. vexflow draws a repeat's thick line over [x - 2, x + 1] and its
	 * thin line one px wide at x + 3 (opening) or x - 5 (closing), so the wings start from
	 * the thick line's edge on the dots' side and from the thin line's outer edge.
	 */
	private drawSign(
		top: Stave,
		bottom: Stave,
		x: number,
		facing: Facing,
		winged: Winged,
	): Rect[] {
		if (winged === 'none') {
			return [];
		}
		const space = top.getSpacingBetweenLines();
		const curved = winged === 'curved' || winged === 'double-curved';
		const double = winged === 'double-straight' || winged === 'double-curved';
		const thickEdge = facing === 1 ? x - 2 : x + 1;
		const roots: { x: number; width: number }[] = [{ x: thickEdge, width: 3 }];
		if (double) {
			roots.push({ x: facing === 1 ? x + 3 : x - 4, width: 1 });
		}
		const ends = [
			{ y: top.getTopLineTopY(), up: -1 },
			{ y: bottom.getBottomLineBottomY(), up: 1 },
		];
		return roots.flatMap((root) =>
			ends.map((end) =>
				this.drawWing(
					root,
					end.y,
					end.up * WING_RISE * space,
					facing * WING_REACH * space,
					curved,
					facing,
				),
			),
		);
	}

	/*
	 * One wing, filled as a shape so it takes the line's own weight at its root. A straight
	 * wing is a slanted stroke as wide as its line; a curved one leaves its line upright and
	 * bends over toward the music, tapering to a point like a bracket's curl.
	 */
	private drawWing(
		root: { x: number; width: number },
		y: number,
		rise: number,
		reach: number,
		curved: boolean,
		facing: Facing,
	): Rect {
		// The root's two edges: `back` is the one away from the music, `front` toward it.
		const back = facing === 1 ? root.x : root.x + root.width;
		const front = back + facing * root.width;
		const ctx = this.context;
		ctx.beginPath();
		ctx.moveTo(back, y);
		if (curved) {
			ctx.quadraticCurveTo(back, y + rise, back + reach, y + rise);
			ctx.quadraticCurveTo(front, y + rise * 0.6, front, y);
		} else {
			ctx.lineTo(back + reach, y + rise);
			ctx.lineTo(front + reach, y + rise);
			ctx.lineTo(front, y);
		}
		ctx.closePath();
		ctx.fill();
		const xs = [back, front, back + reach, front + reach];
		const left = Math.min(...xs);
		return new Rect(
			left,
			Math.min(y, y + rise),
			Math.max(...xs) - left,
			Math.abs(rise),
		);
	}
}
