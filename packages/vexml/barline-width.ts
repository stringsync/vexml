import { type RenderContext, type Stave, StaveConnector } from 'vexflow/core';
import type { Appearance } from './appearance';
import { DEFAULT_BEAM_WIDTH } from './constants';

/* vexflow's own thin bar width; every heavy stroke is beam weight instead of its 3px. */
const LIGHT = 1;
const ORDINARY = 2;
/* VexFlow’s gap for barline pairs with no spacing rule. */
const GAP = 2;
const DOT_RADIUS = 2;
const REPEAT_DOT_OFFSET = 4;
// VexFlow’s trailing modifier already allows for this much repeat ink.
const VEXFLOW_REPEAT_END_INSET = 10;
const THIN_DOUBLE_SPACING = 0.75;
const FINAL_STROKE_GAP = 0.5;
const REPEAT_STROKE_GAP = 1 / 3;

export type BarKind = 'light' | 'heavy';
export type BarStroke = BarKind | 'ordinary';

/*
 * The widths vexflow draws barlines at (`<line-width type="light barline">` and `"heavy
 * barline"`). vexflow hardcodes them in Barline's draw methods and exports no setting, so
 * vexml's staves hold DocumentBarlines (see document-barline), which draw at the widths a draw pass sets. Ordinary
 * dividers have their own default. Global state like the stem width (see StemWidth): every
 * pass sets it afresh, and the connectors joining a system's barlines read it too (see
 * drawBarConnector), so the two always agree.
 */
export class BarlineWidths {
	private static light: number | null = null;
	private static heavy: number | null = null;
	private static beam = DEFAULT_BEAM_WIDTH;

	/* Draw barlines at these widths from here on; nulls use the defaults. */
	set(light: number | null, heavy: number | null, beam: number): void {
		BarlineWidths.light = light;
		BarlineWidths.heavy = heavy;
		BarlineWidths.beam = beam;
	}

	static current(): Record<BarStroke, number> {
		return {
			light: BarlineWidths.light ?? LIGHT,
			heavy: BarlineWidths.heavy ?? BarlineWidths.beam,
			ordinary: BarlineWidths.light ?? ORDINARY,
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
 * geometry vexflow's own Barline uses, so a 1px thin bar sits at x and a heavy one ends at x + 1.
 */
export function barRects(
	kinds: readonly BarStroke[],
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

type BarConnectorType =
	| 'singleLeft'
	| 'singleRight'
	| 'thinDouble'
	| 'boldDoubleLeft'
	| 'boldDoubleRight'
	| 'final';

interface BarConnectorOptions {
	top: Stave;
	bottom: Stave;
	type: BarConnectorType;
	xShift?: number;
}

/*
 * Join `top` to `bottom` with the barline a connector of `type` draws, at the current widths.
 * vexflow's StaveConnector hardcodes its bar widths like Barline does, so while a document's
 * width is in force the barline types are drawn here instead. Measure endings and repeats
 * always use this path so their strokes line up across staves.
 */
export function drawBarConnector(
	ctx: RenderContext,
	opts: BarConnectorOptions,
): void {
	const { top, bottom, type } = opts;
	const xShift = opts.xShift ?? 0;
	ctx.openGroup('vexml-staveconnector');
	try {
		const spacing = top.getSpacingBetweenLines();
		const left = type === 'singleLeft' || type === 'boldDoubleLeft';
		const x = top.getX() + (left ? xShift : top.getWidth());
		if (type === 'singleLeft' && !BarlineWidths.custom()) {
			new StaveConnector(top, bottom).setType(type).setContext(ctx).draw();
			return;
		}
		let rects: Array<[offset: number, width: number]>;
		switch (type) {
			case 'final':
				rects = closingBarRects(spacing);
				break;
			case 'boldDoubleRight':
				rects = endBarRects(spacing * REPEAT_STROKE_GAP);
				break;
			case 'boldDoubleLeft':
				rects = openingRepeatRects(spacing);
				break;
			case 'singleRight':
				rects = barRects(['ordinary']);
				break;
			case 'thinDouble':
				rects = barRects(['ordinary', 'ordinary'], thinDoubleGap(spacing));
				break;
			case 'singleLeft':
				rects = [[0, BarlineWidths.current().light]];
				break;
		}
		const topY = top.getYForLine(0);
		const botY = bottom.getYForLine(bottom.getNumLines() - 1);
		fillRects(ctx, x, topY, botY, rects);
	} finally {
		ctx.closeGroup();
	}
}

/* The horizontal offset from an opening repeat barline's x to the left edge of its heavy bar. */
export function openingRepeatLeftOffset(): number {
	return LIGHT - BarlineWidths.current().heavy;
}

/* Both repeat directions share the heavy stroke at x when a section closes and reopens. */
function openingRepeatRects(
	spacing: number,
): Array<[offset: number, width: number]> {
	const { ordinary, heavy } = BarlineWidths.current();
	return [
		[LIGHT - heavy, heavy],
		[LIGHT + spacing * REPEAT_STROKE_GAP, ordinary],
	];
}

export function thinDoubleGap(staveSpace: number): number {
	// Leave a visible gap even when the document requests unusually wide strokes.
	return Math.max(
		1,
		staveSpace * THIN_DOUBLE_SPACING - BarlineWidths.current().ordinary,
	);
}

export function drawsFinalBarline(
	style: string | null,
	last: boolean,
	repeatEnd: boolean,
	connected: boolean,
): boolean {
	return (
		!repeatEnd &&
		(style === 'light-heavy' ||
			(last && (!style || (connected && style !== 'light-light'))))
	);
}

export function finalBarlineInset(
	spacing: number,
	appearance: Appearance,
): number {
	return endBarlineInset(spacing * FINAL_STROKE_GAP, appearance);
}

function endBarlineInset(gap: number, appearance: Appearance): number {
	const thin = appearance.lineWidth('light barline') ?? ORDINARY;
	const thick =
		appearance.lineWidth('heavy barline') ??
		appearance.lineWidth('beam') ??
		DEFAULT_BEAM_WIDTH;
	return thin + thick + gap - LIGHT;
}

export function repeatEndPadding(
	spacing: number,
	appearance: Appearance,
): number {
	const inset =
		endBarlineInset(spacing * REPEAT_STROKE_GAP, appearance) +
		REPEAT_DOT_OFFSET +
		DOT_RADIUS;
	return inset - VEXFLOW_REPEAT_END_INSET;
}

export function closingBarRects(
	spacing: number,
): Array<[offset: number, width: number]> {
	return endBarRects(spacing * FINAL_STROKE_GAP);
}

function endBarRects(gap: number): Array<[offset: number, width: number]> {
	return barRects(['ordinary', 'heavy'], gap);
}

export function fillBars(
	stave: Stave,
	x: number,
	rects: Array<[offset: number, width: number]>,
): void {
	const { topY, botY } = stave.getBarlineBounds();
	fillRects(stave.checkContext(), x, topY, botY, rects);
}

/*
 * Fill each rect with its edges on whole pixels, so a stroke at a fractional x (a stave's, or a
 * gap of a third of a space) stays solid instead of smearing grey across two columns.
 */
function fillRects(
	ctx: RenderContext,
	x: number,
	topY: number,
	botY: number,
	rects: Array<[offset: number, width: number]>,
): void {
	for (const [offset, width] of rects) {
		const left = Math.round(x + offset);
		const right = Math.max(left + 1, Math.round(x + offset + width));
		ctx.fillRect(left, topY, right - left, botY - topY);
	}
}

/* A repeat sign: thick and thin bars, the thin one toward the dots, which sit past it. */
export function drawRepeat(
	stave: Stave,
	x: number,
	begin: boolean,
	barSpacing: number,
): void {
	const rects = begin
		? openingRepeatRects(barSpacing)
		: endBarRects(barSpacing * REPEAT_STROKE_GAP);
	fillBars(stave, x, rects);
	const ctx = stave.checkContext();
	const { topY, botY } = stave.getBarlineBounds();
	const [thinOffset, thinWidth] = begin
		? (rects[1] ?? [0, 0])
		: (rects[0] ?? [0, 0]);
	const dotX = begin
		? x + thinOffset + thinWidth + REPEAT_DOT_OFFSET
		: x + thinOffset - REPEAT_DOT_OFFSET;
	const spacing = stave.getSpacingBetweenLines();
	const bottomLine = botY - (stave.getStyle().lineWidth ?? 1);
	const firstDotY = (topY + bottomLine - spacing) / 2 + DOT_RADIUS / 2;
	for (let i = 0; i < 2; i++) {
		ctx.beginPath();
		ctx.arc(dotX, firstDotY + i * spacing, DOT_RADIUS, 0, Math.PI * 2, false);
		ctx.fill();
	}
}
