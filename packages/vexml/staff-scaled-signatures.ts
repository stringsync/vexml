import {
	type Element,
	KeySignature,
	type Stave,
	StaveModifierPosition,
	type TimeSignature,
} from 'vexflow/core';

/* The step (C..B) and alter (1 sharp, -1 flat, 0 a natural) a key accidental marks. */
export interface KeyPitch {
	step: string;
	alter: number;
}

/* A key accidental as drawn: its pitch and its glyph's box. */
export interface DrawnKeyAccidental extends KeyPitch {
	x: number;
	y: number;
	w: number;
	h: number;
}

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
export abstract class StaffKeySignature extends KeySignature {
	/* Each accidental this signature drew, left to right: the step and alter it marks and its
	 * glyph's box, in the stave's drawing space. Read after the stave is formatted, which
	 * places the signature. */
	getAccidentals(): DrawnKeyAccidental[] {
		if (!this.formatted) {
			this.format();
		}
		return this.children.map((glyph, i) => {
			const box = glyph.getBoundingBox();
			return {
				...this.pitchOf(this.accList[i] ?? { type: 'n', line: 0 }, i),
				x: this.x + box.getX(),
				y: box.getY(),
				w: box.getW(),
				h: box.getH(),
			};
		});
	}

	/* Whether it opens the stave (rather than hanging naturals at its end). */
	opensStave(): boolean {
		return this.getPosition() === StaveModifierPosition.BEGIN;
	}

	/* The step and alter the accidental at `index` of the drawn list marks. */
	protected abstract pitchOf(
		acc: { type: string; line: number },
		index: number,
	): KeyPitch;

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
