import {
	Barline,
	type RenderContext,
	type Stave,
	StaveConnector,
	type StaveConnectorType,
} from 'vexflow/core';

/* vexflow's own bar widths: a thin bar is 1px, a thick one 3px. */
const LIGHT = 1;
const HEAVY = 3;
/* The space between two bars of one barline, and from a repeat's thin bar to its dots. */
const GAP = 2;
const DOT_RADIUS = 2;

export type BarKind = 'light' | 'heavy';

/*
 * The widths vexflow draws barlines at (`<line-width type="light barline">` and `"heavy
 * barline"`). vexflow hardcodes them in Barline's draw methods and exports no setting, so this
 * swaps those methods, once per page, for ones that draw at the widths a draw pass sets, and
 * leaves vexflow's own drawing in place while both are null. Global vexflow state like the stem
 * width (see StemWidth): every pass sets it afresh, and the connectors joining a system's
 * barlines read it too (see drawBarConnector), so the two always agree.
 */
export class BarlineWidths {
	private static installed = false;
	private static light: number | null = null;
	private static heavy: number | null = null;

	/* Draw barlines at these widths from here on; nulls put vexflow's own back. */
	set(light: number | null, heavy: number | null): void {
		BarlineWidths.light = light;
		BarlineWidths.heavy = heavy;
		if (BarlineWidths.installed) {
			return;
		}
		BarlineWidths.installed = true;
		const proto = Barline.prototype;
		const vertical = proto.drawVerticalBar;
		const end = proto.drawVerticalEndBar;
		const repeat = proto.drawRepeatBar;
		proto.drawVerticalBar = function (stave, x, double) {
			if (!BarlineWidths.custom()) {
				return vertical.call(this, stave, x, double);
			}
			fillBars(stave, x, double ? ['light', 'light'] : ['light']);
		};
		proto.drawVerticalEndBar = function (stave, x) {
			if (!BarlineWidths.custom()) {
				return end.call(this, stave, x);
			}
			fillBars(stave, x, ['light', 'heavy']);
		};
		proto.drawRepeatBar = function (stave, x, begin) {
			if (!BarlineWidths.custom()) {
				return repeat.call(this, stave, x, begin);
			}
			drawRepeat(stave, x, begin);
		};
	}

	/* The widths barlines draw at now: vexflow's own for each the document leaves out. */
	static current(): { light: number; heavy: number } {
		return {
			light: BarlineWidths.light ?? LIGHT,
			heavy: BarlineWidths.heavy ?? HEAVY,
		};
	}

	/* Whether a document's width is in force, so vexflow's own drawing has to be replaced. */
	static custom(): boolean {
		return BarlineWidths.light !== null || BarlineWidths.heavy !== null;
	}
}

/*
 * The [offset, width] rects of a barline whose bars run left to right as `kinds`, measured from
 * the barline's x: the last bar ends at x + 1 and each sits `gap` px from the next, the
 * geometry vexflow's own Barline uses, so at its widths a thin bar is 1px at x and a thick one
 * 3px at x - 2.
 */
export function barRects(
	kinds: readonly BarKind[],
	gap = GAP,
): Array<[offset: number, width: number]> {
	const widths = BarlineWidths.current();
	const rects: Array<[number, number]> = [];
	let right = LIGHT;
	for (const kind of [...kinds].reverse()) {
		const width = widths[kind];
		rects.unshift([right - width, width]);
		right -= width + gap;
	}
	return rects;
}

/*
 * Join `top` to `bottom` with the barline a connector of `type` draws, at the current widths.
 * vexflow's StaveConnector hardcodes its bar widths like Barline does, so while a document's
 * width is in force the barline types are drawn here instead; anything else (and every
 * connector while none is) stays vexflow's.
 */
export function drawBarConnector(
	ctx: RenderContext,
	top: Stave,
	bottom: Stave,
	type: StaveConnectorType,
	xShift = 0,
): void {
	ctx.openGroup('vexml-staveconnector');
	try {
		const kinds = CONNECTOR_BARS[type];
		if (!BarlineWidths.custom() || !kinds) {
			new StaveConnector(top, bottom)
				.setType(type)
				.setXShift(xShift)
				.setContext(ctx)
				.draw();
			return;
		}
		const topY = top.getYForLine(0);
		const botY = bottom.getYForLine(bottom.getNumLines() - 1);
		const left = type === 'singleLeft' || type === 'boldDoubleLeft';
		const x = top.getX() + (left ? xShift : top.getWidth());
		for (const [offset, width] of left ? leftRects(kinds) : barRects(kinds)) {
			ctx.fillRect(x + offset, topY, width, botY - topY);
		}
	} finally {
		ctx.closeGroup();
	}
}

/* The bars of each connector type that draws a barline, left to right. */
const CONNECTOR_BARS: Partial<Record<StaveConnectorType, BarKind[]>> = {
	singleLeft: ['light'],
	singleRight: ['light'],
	thinDouble: ['light', 'light'],
	boldDoubleLeft: ['heavy', 'light'],
	boldDoubleRight: ['light', 'heavy'],
};

/* A left-edge barline's rects: a plain line starts at x, and an opening repeat's thick bar
 * ends at x + 1 as vexflow draws it, the thin one past it. */
function leftRects(kinds: readonly BarKind[]): Array<[number, number]> {
	const widths = BarlineWidths.current();
	if (kinds.length === 1) {
		return [[0, widths.light]];
	}
	return [
		[LIGHT - widths.heavy, widths.heavy],
		[LIGHT + GAP, widths.light],
	];
}

function fillBars(stave: Stave, x: number, kinds: readonly BarKind[]): void {
	const ctx = stave.checkContext();
	const topY = stave.getTopLineTopY();
	const height = stave.getBottomLineBottomY() - topY;
	for (const [offset, width] of barRects(kinds)) {
		ctx.fillRect(x + offset, topY, width, height);
	}
}

/* A repeat sign: thick and thin bars, the thin one toward the dots, which sit past it. */
function drawRepeat(stave: Stave, x: number, begin: boolean): void {
	const rects = begin
		? leftRects(['heavy', 'light'])
		: barRects(['light', 'heavy']);
	const ctx = stave.checkContext();
	const topY = stave.getTopLineTopY();
	const height = stave.getBottomLineBottomY() - topY;
	for (const [offset, width] of rects) {
		ctx.fillRect(x + offset, topY, width, height);
	}
	// vexflow centers its 2px dots 4px past the thin bar's near edge.
	const [thinOffset, thinWidth] = begin
		? (rects[1] ?? [0, 0])
		: (rects[0] ?? [0, 0]);
	const dotX = begin
		? x + thinOffset + thinWidth + GAP + 1 + DOT_RADIUS / 2
		: x + thinOffset - GAP - 1 - DOT_RADIUS / 2;
	const spacing = stave.getSpacingBetweenLines();
	let dotY =
		topY +
		((stave.getNumLines() - 1) * spacing) / 2 -
		spacing / 2 +
		DOT_RADIUS / 2;
	for (let i = 0; i < 2; i++) {
		ctx.beginPath();
		ctx.arc(dotX, dotY, DOT_RADIUS, 0, Math.PI * 2, false);
		ctx.fill();
		dotY += spacing;
	}
}
