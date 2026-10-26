import { Element, type RenderContext, type Stave } from 'vexflow/core';
import { SLASH_GLYPH_FILLED, SLASH_GLYPHS } from './chord-translator';
import type { MeasureStyleMark, StyleSign } from './score-reader';

/*
 * Draws what a <measure-style> shows in place of a measure's written-out notes: a measure
 * repeat sign, a beat repeat's slashes on each beat, or a slash on each beat. Drawn straight
 * onto the stave once it is on the canvas, like a multirest: the sign stands for the music,
 * so there is nothing for the formatter to space it against.
 */
export class MeasureStyleDrawer {
	constructor(private readonly context: RenderContext) {}

	draw(stave: Stave, mark: MeasureStyleMark): void {
		switch (mark.kind) {
			case 'measure-repeat':
				this.drawMeasureRepeat(stave, mark);
				return;
			case 'beat-repeat':
				this.drawPerBeat(stave, mark, beatRepeatGlyph(mark), 'center');
				return;
			case 'beat-slash':
				this.drawPerBeat(stave, mark, beatSlashGlyph(mark), 'start');
				return;
		}
	}

	/*
	 * One sign per pattern: a one-bar repeat centered in its measure, a two- or four-bar one
	 * centered on the barline halfway through its pattern, with the pattern's length above.
	 * The pattern's other measures stay empty.
	 */
	private drawMeasureRepeat(
		stave: Stave,
		mark: Extract<MeasureStyleMark, { kind: 'measure-repeat' }>,
	): void {
		const { count, bar } = mark;
		const even = count % 2 === 0;
		if (bar !== (even ? count / 2 - 1 : (count - 1) / 2)) {
			return;
		}
		const x = even
			? stave.getX() + stave.getWidth()
			: (stave.getNoteStartX() + stave.getNoteEndX()) / 2;
		// The text names the pattern's length; `slashes` overrides the sign it draws with.
		const slashes = mark.slashes > 1 ? mark.slashes : count;
		// ponytail: SMuFL has signs for 1, 2 and 4 bars only, so a 3-bar or longer pattern
		// draws the nearest one below it.
		let glyph = REPEAT_1_BAR;
		if (slashes >= 4) {
			glyph = REPEAT_4_BARS;
		} else if (slashes >= 2) {
			glyph = REPEAT_2_BARS;
		}
		this.drawCentered(glyph, x, middleLineY(stave));
		if (count > 1) {
			const number = new Element('MultiMeasureRest');
			number.setText(timeSigDigits(count));
			number.renderText(
				this.context,
				x - number.getWidth() / 2,
				stave.getYForLine(NUMBER_LINE) - number.getHeight() / 2,
			);
		}
	}

	/*
	 * One glyph on each beat, at the beat's place in the measure: centered in its share of
	 * the note area for a beat repeat, which stands for the whole beat, and at its start for a
	 * slash, which stands where the beat's first note would.
	 */
	private drawPerBeat(
		stave: Stave,
		mark: Extract<MeasureStyleMark, { kind: 'beat-repeat' | 'beat-slash' }>,
		glyph: string,
		align: 'center' | 'start',
	): void {
		const left = stave.getNoteStartX() + BEAT_PADDING;
		const area = stave.getNoteEndX() - BEAT_PADDING - left;
		const y = middleLineY(stave);
		mark.beats.forEach((beat, i) => {
			const next = mark.beats[i + 1] ?? mark.length;
			const at = align === 'center' ? (beat + next) / 2 : beat;
			const x = left + (at / mark.length) * area;
			if (align === 'center') {
				this.drawCentered(glyph, x, y);
				return;
			}
			if (mark.kind === 'beat-slash') {
				this.drawSlash(stave, mark, x, y);
			}
		});
	}

	/* One sign with its left edge at `x`: where the first note of a beat the span replaces sat. */
	drawSign(stave: Stave, sign: StyleSign, x: number): void {
		const y = middleLineY(stave);
		if (sign.kind === 'beat-repeat') {
			new Element()
				.setText(beatRepeatGlyph(sign))
				.renderText(this.context, x, y);
			return;
		}
		this.drawSlash(stave, sign, x, y);
	}

	private drawSlash(
		stave: Stave,
		sign: Extract<StyleSign, { kind: 'beat-slash' }>,
		x: number,
		y: number,
	): void {
		const head = new Element().setText(beatSlashGlyph(sign));
		head.renderText(this.context, x, y);
		if (dotted(sign)) {
			// An augmentation dot sits in the space above the line its note is on.
			new Element()
				.setText(AUGMENTATION_DOT)
				.renderText(
					this.context,
					x + head.getWidth() + DOT_GAP,
					y - stave.getSpacingBetweenLines() / 2,
				);
		}
	}

	private drawCentered(glyph: string, x: number, y: number): void {
		const element = new Element().setText(glyph);
		element.renderText(this.context, x - element.getWidth() / 2, y);
	}
}

/* The middle line of the stave, where every sign here sits: line 2 of five, 2.5 of six. */
function middleLineY(stave: Stave): number {
	return stave.getYForLine((stave.getNumLines() - 1) / 2);
}

/* `slashes` slashes, between the upper-left and lower-right dots when the repeat uses them. */
function beatRepeatGlyph(mark: { slashes: number; dots: boolean }): string {
	const slashes = REPEAT_BAR_SLASH.repeat(mark.slashes);
	return mark.dots
		? `${REPEAT_BAR_UPPER_DOT}${slashes}${REPEAT_BAR_LOWER_DOT}`
		: slashes;
}

/* Whether the slashes carry a dot: the unit is a dotted length and the slash asks for dots. */
function dotted(mark: { dots: boolean; unit: number }): boolean {
	return mark.dots && !Number.isInteger(Math.log2(mark.unit));
}

/* The slash notehead for the unit's length: open for a half or longer, else filled. */
function beatSlashGlyph(mark: { unit: number }): string {
	const { unit } = mark;
	let head = SLASH_GLYPH_FILLED;
	if (unit >= 4) {
		head = SLASH_GLYPHS.w ?? head;
	} else if (unit >= 2) {
		head = SLASH_GLYPHS.h ?? head;
	}
	return head;
}

/* A number in SMuFL's time-signature digits, as vexflow's MultiMeasureRest prints its count. */
function timeSigDigits(count: number): string {
	return [...String(count)]
		.map((digit) => String.fromCodePoint(TIME_SIG_0 + Number(digit)))
		.join('');
}

// SMuFL codepoints: repeat1Bar, repeat2Bars, repeat4Bars, repeatBarSlash,
// repeatBarUpperDot, repeatBarLowerDot, augmentationDot, timeSig0.
const REPEAT_1_BAR = '';
const REPEAT_2_BARS = '';
const REPEAT_4_BARS = '';
const REPEAT_BAR_SLASH = '';
const REPEAT_BAR_UPPER_DOT = '';
const REPEAT_BAR_LOWER_DOT = '';
const AUGMENTATION_DOT = '';
const TIME_SIG_0 = 0xe080;

// The stave line a multi-bar repeat's count centers on: half a space above the top line,
// where vexflow's MultiMeasureRest puts its own.
const NUMBER_LINE = -0.5;

// The gap between a slash and its augmentation dot, in px.
const DOT_GAP = 3;

// Room kept between a beat sign and the note area's edges, in px.
const BEAT_PADDING = 8;
