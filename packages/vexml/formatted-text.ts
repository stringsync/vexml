import { Element, type RenderContext } from 'vexflow/core';
import { Rect } from 'webappwiz/geometry';
import {
	ENCLOSED_BASELINE,
	UNDERLINE_GAP,
	UNDERLINE_OFFSET,
} from './constants';
import { type EnclosureShape, TextEnclosure } from './text-enclosure';

/*
 * One string as the document formatted it: the text, the lines under it and the shape
 * around it, measured as one box so they clear their neighbors together. The caller sets
 * the font on the context first, places `w` × `h` with the collision resolver, then draws
 * into the placed box.
 */
export class FormattedText {
	/** The box's size once rotated: what the collision resolver places. */
	readonly w: number;
	readonly h: number;
	// The box before it turns, which is the one the text, lines and shape are laid in.
	private readonly boxW: number;
	private readonly boxH: number;
	private readonly textW: number;
	// How far the text's ink reaches left of where it is drawn from: a SMuFL dynamic's tail
	// hangs back past its origin, out of the advance width measureText reports.
	private readonly inkLeft: number;
	// The text box with its underlines, the part an enclosure holds.
	private readonly innerH: number;
	private readonly enclosure: TextEnclosure | null;

	constructor(
		private readonly context: RenderContext,
		private readonly text: string,
		private readonly style: FormattedTextStyle,
	) {
		this.textW = context.measureText(text).width;
		this.inkLeft = 0;
		if (style.enclosure) {
			// An enclosure holds the ink, not the advance, or a glyph's overhang pokes through it.
			const { family, size, weight, fontStyle } = style.font;
			const ink = new Element()
				.setFont(family, size, weight, fontStyle)
				.setText(text)
				.getTextMetrics();
			this.inkLeft = Math.max(ink.actualBoundingBoxLeft, 0);
			this.textW =
				Math.max(this.textW, ink.actualBoundingBoxRight) + this.inkLeft;
		}
		const underline = style.underline ?? 0;
		this.innerH =
			style.textHeight +
			(underline > 0 ? UNDERLINE_OFFSET + (underline - 1) * UNDERLINE_GAP : 0);
		this.enclosure = style.enclosure
			? new TextEnclosure(style.enclosure, style.padding ?? 0)
			: null;
		const size = this.enclosure
			? this.enclosure.size(this.textW, this.innerH)
			: { w: this.textW, h: this.innerH };
		this.boxW = size.w;
		this.boxH = size.h;
		const radians = this.radians();
		const cos = Math.abs(Math.cos(radians));
		const sin = Math.abs(Math.sin(radians));
		this.w = size.w * cos + size.h * sin;
		this.h = size.w * sin + size.h * cos;
	}

	/** Top of the placed box that aligns the text's ink (or baseline) on anchorY.
	 * Decorations travel with the text; they do not change its alignment point. */
	topAt(
		anchorY: number,
		align: 'top' | 'middle' | 'bottom' | 'baseline',
	): number {
		const origin = new Rect(0, 0, this.boxW, this.boxH);
		const inner = this.enclosure
			? this.enclosure.textBox(origin, this.textW, this.innerH)
			: origin;
		const baseline = this.baselineIn(inner);
		if (align === 'baseline') {
			return anchorY - baseline;
		}
		const { family, size, weight, fontStyle } = this.style.font;
		const ink = new Element()
			.setFont(family, size, weight, fontStyle)
			.setText(this.text)
			.getTextMetrics();
		const top = baseline - ink.actualBoundingBoxAscent;
		const bottom = baseline + ink.actualBoundingBoxDescent;
		if (align === 'top') {
			return anchorY - top;
		}
		if (align === 'bottom') {
			return anchorY - bottom;
		}
		return anchorY - (top + bottom) / 2;
	}

	private baselineIn(inner: Rect): number {
		if (this.style.hangs) {
			return inner.y;
		}
		return (
			inner.y + this.style.textHeight * (this.enclosure ? ENCLOSED_BASELINE : 1)
		);
	}

	private radians(): number {
		return ((this.style.rotation ?? 0) * Math.PI) / 180;
	}

	/** Draw the text, its underlines and its enclosure into `placed`, a `w` × `h` box, in the
	 * context's current font, fill and stroke. */
	draw(placed: Rect): void {
		// Only vexflow's canvas context wraps a 2D context to turn; any other draws upright.
		const canvas = (this.context as { context2D?: CanvasRenderingContext2D })
			.context2D;
		if (!this.style.rotation || !canvas?.rotate) {
			this.drawUpright(placed);
			return;
		}
		// The text turns about the middle of its box, which stays the middle of `placed`.
		const cx = placed.x + placed.w / 2;
		const cy = placed.y + placed.h / 2;
		canvas.save();
		canvas.translate(cx, cy);
		canvas.rotate(this.radians());
		canvas.translate(-cx, -cy);
		this.drawUpright(
			new Rect(cx - this.boxW / 2, cy - this.boxH / 2, this.boxW, this.boxH),
		);
		canvas.restore();
	}

	private drawUpright(placed: Rect): void {
		const inner = this.enclosure
			? this.enclosure.textBox(placed, this.textW, this.innerH)
			: new Rect(placed.x, placed.y, this.textW, this.innerH);
		const { textHeight } = this.style;
		const textBottom = inner.y + textHeight;
		const baseline = this.baselineIn(inner);
		this.context.fillText(this.text, inner.x + this.inkLeft, baseline);
		const underline = this.style.underline ?? 0;
		if (underline > 0 || this.enclosure) {
			this.context.setLineWidth(1);
		}
		for (let i = 0; i < underline; i++) {
			const y = textBottom + UNDERLINE_OFFSET + i * UNDERLINE_GAP;
			this.context.beginPath();
			this.context.moveTo(inner.x, y);
			this.context.lineTo(inner.right, y);
			this.context.stroke();
		}
		if (this.enclosure && this.style.enclosureWidth) {
			this.context.setLineWidth(this.style.enclosureWidth);
		}
		this.enclosure?.draw(this.context, placed);
	}
}

export type FormattedTextStyle = {
	/** The face the context is set to, to measure the ink an enclosure holds. */
	font: { family: string; size: number; weight: string; fontStyle: string };
	/** The height of the text's box: the font size, or the ink's when that is shorter. */
	textHeight: number;
	/** Whether the ink hangs down from the baseline rather than standing on it. */
	hangs?: boolean;
	/** How many lines run under the text. Absent means none. */
	underline?: number;
	/** The shape drawn around the text. Absent means none. */
	enclosure?: EnclosureShape;
	/** Air between the text and its enclosure. */
	padding?: number;
	/** The enclosure's stroke width (`<line-width type="enclosure">`). Absent means 1px. */
	enclosureWidth?: number;
	/** Degrees clockwise the whole box turns, about its middle. Absent means upright. */
	rotation?: number;
};
