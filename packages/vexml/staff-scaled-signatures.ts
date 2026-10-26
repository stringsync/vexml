import {
	type Element,
	KeySignature,
	type Stave,
	type TimeSignature,
} from 'vexflow/core';

/** vexflow's default space between staff lines, in px. */
const STAVE_LINE_DISTANCE = 10;

/* How much smaller (or larger) than normal a stave draws, read off its line spacing. */
export function staveRatio(stave: Stave): number {
	return stave.getSpacingBetweenLines() / STAVE_LINE_DISTANCE;
}

/*
 * A key signature whose accidentals follow the stave's line spacing. vexflow builds each glyph
 * at a fixed font size, so on a staff-size staff the accidentals stay full size beside shrunk
 * lines; this lays them out the way vexflow does, at the stave's share of that size.
 */
export class StaffKeySignature extends KeySignature {
	protected override convertToGlyph(
		acc: { type: string; line: number },
		nextAcc: { type: string; line: number },
		stave: Stave,
	): void {
		const before = this.width;
		super.convertToGlyph(acc, nextAcc, stave);
		const glyph = this.children[this.children.length - 1];
		if (!glyph) {
			return;
		}
		// The parent added the full-size width plus its gap; keep the gap, swap the glyph.
		const gap = this.width - before - glyph.getWidth();
		glyph.setFontSize(glyph.fontSizeInPoints * staveRatio(stave));
		this.width = before + glyph.getWidth() + gap;
	}
}

/*
 * A plain time signature at the stave's share of its glyph size. The digits are laid out at
 * construction, so they are laid out again once resized; the top-line shift vexflow picks
 * from the full-size digits' height is kept, since it places the digits, not the glyphs.
 */
export function scaleTimeSignature(sig: TimeSignature, stave: Stave): void {
	const ratio = staveRatio(stave);
	if (ratio === 1) {
		return;
	}
	const inner = sig as unknown as {
		topText: Element;
		botText: Element;
		lineShift: number;
	};
	const lineShift = inner.lineShift;
	for (const el of [sig, inner.topText, inner.botText]) {
		el.setFontSize(el.fontSizeInPoints * ratio);
	}
	sig.setTimeSig(sig.getTimeSpec());
	inner.lineShift = lineShift;
}
