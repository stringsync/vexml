import { Rect } from 'core/geometry';
import { Bend, Element, Modifier, type TabNote } from 'vexflow/core';
import type { TabBendMark } from './score-reader';

/* The SMuFL vibrato-bar glyphs a <with-bar> names by its content. */
const BAR_GLYPHS: Record<string, string> = {
	scoop: '\uE830', // guitarVibratoBarScoop
	dip: '\uE831', // guitarVibratoBarDip
};

/* The text a <with-bar> with no glyph of its own prints: its content, else the guitar
 * shorthand for "with the whammy bar". */
const BAR_TEXT = 'w/bar';

/* How far above a fret's center a pre-bend arrow starts, clear of the enlarged digit. */
const PRE_BEND_GAP = 8;

/* The bar glyph's font size: two thirds of the notation font's 30, so a dip stands about
 * a stave space and a half tall, the height of a bend arrow. */
const BAR_GLYPH_SIZE = 20;

/* Half the width of the arrowheads, as vexflow's Bend draws them. */
const ARROW_HALF_WIDTH = 4;

/*
 * A vexflow Bend that also draws what vexflow's leaves out: angled legs, a pre-bend's
 * vertical arrow, and a whammy-bar dip or scoop. It stays a Bend (same category, same
 * phrase and text line) so vexflow's modifier formatter stacks and sizes it as before, and
 * reimplements draw, which vexflow keeps as one closed function, from the same geometry:
 * the arrow tips (textLine + 1) stave spaces above the highest fret, the label just above.
 */
export class TabBend extends Bend {
	private readonly glyph: Element | null;

	private readonly down: boolean;

	/*
	 * `label` is the amount printed at the tip. A <with-bar> naming no glyph prints its text
	 * (or "w/bar") before it. A negative <bend-alter> bends the pitch down, so its one leg
	 * falls; a <release/> after a rising leg adds the falling one.
	 */
	constructor(
		label: string,
		readonly mark: TabBendMark,
	) {
		const code = mark.bar === null ? undefined : BAR_GLYPHS[mark.bar];
		const down = mark.semitones < 0;
		const text =
			mark.bar === null || code ? label : `${mark.bar || BAR_TEXT} ${label}`;
		const first = { type: down ? Bend.DOWN : Bend.UP, text };
		super(
			mark.release && !down ? [first, { type: Bend.DOWN, text: '' }] : [first],
		);
		this.down = down;
		this.glyph = code
			? new Element().setText(code).setFontSize(BAR_GLYPH_SIZE)
			: null;
	}

	/* Whether the bend travels toward the next note, so the draw pass stretches its legs. */
	private travels(): boolean {
		return !this.mark.preBend && this.glyph === null;
	}

	/*
	 * Spread the legs over `width` px: the whole span for a plain bend, a bend-and-release
	 * peaking at its midpoint. A pre-bend or a bar glyph sits on its fret and keeps its size.
	 */
	stretch(width: number): void {
		if (!this.travels()) {
			return;
		}
		const [first, second] = this.phrase;
		if (!first) {
			return;
		}
		first.drawWidth = second ? width / 2 : width;
		if (second) {
			second.drawWidth = 0;
		}
	}

	/*
	 * The band the bend's ink takes, for the collision resolver: vexflow gives a modifier no
	 * bounding box, so above-stave words placed later would print straight through it.
	 */
	inkRect(): Rect {
		const note = this.checkAttachedNote() as TabNote;
		const { labelY } = this.heights(note);
		const top = labelY - this.getTextHeight();
		const fretY = Math.min(...note.getYs());
		const labelHalf = this.getWidth() / 2;
		let left: number;
		let right: number;
		if (this.mark.preBend) {
			left = note.getAbsoluteX() - labelHalf;
			right = note.getAbsoluteX() + labelHalf;
		} else {
			left = note.getAbsoluteX();
			right =
				this.legStartX(note) +
				Math.max(this.legsWidth(), this.glyphWidth()) +
				labelHalf;
		}
		return new Rect(left, top, right - left, fretY - top);
	}

	override draw(): void {
		const ctx = this.checkContext();
		const note = this.checkAttachedNote() as TabNote;
		this.setRendered();
		const { baseY, tipY, labelY } = this.heights(note);
		this.applyStyle(ctx, this.getStyleLine());
		ctx.setFont(this.fontInfo);
		const label = (x: number, text: string) => {
			ctx.fillText(text, x - ctx.measureText(text).width / 2, labelY);
		};
		const arrow = (x: number, y: number, direction: 1 | -1) => {
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x - ARROW_HALF_WIDTH, y + ARROW_HALF_WIDTH * direction);
			ctx.lineTo(x + ARROW_HALF_WIDTH, y + ARROW_HALF_WIDTH * direction);
			ctx.closePath();
			ctx.fill();
		};
		const text = this.phrase[0]?.text ?? '';

		if (this.mark.preBend) {
			const x = note.getAbsoluteX();
			const from = Math.min(...note.getYs()) - PRE_BEND_GAP;
			this.leg(x, from, x, tipY);
			arrow(x, tipY, 1);
			label(x, text);
			return;
		}

		const startX = this.legStartX(note);
		if (this.glyph) {
			const width = this.glyphWidth();
			// The glyph stands on the arrow tip's height, clear of the stave, with the label
			// lifted over it.
			const { descent } = this.glyphInk();
			this.glyph.renderText(ctx, startX, tipY - descent);
			ctx.setFont(this.fontInfo);
			label(startX + width / 2, text);
			return;
		}

		const [first, second] = this.phrase;
		const w1 = first?.drawWidth ?? 0;
		if (this.down) {
			this.leg(startX, tipY, startX + w1, baseY);
			arrow(startX + w1, baseY, -1);
			label(startX + w1, text);
			return;
		}
		this.leg(startX, baseY, startX + w1, tipY);
		label(startX + w1, text);
		if (second) {
			const w2 = w1 + (second.drawWidth ?? 0);
			this.leg(startX + w1, tipY, startX + w1 + w2, baseY);
			arrow(startX + w1 + w2, baseY, -1);
		} else {
			arrow(startX + w1, tipY, 1);
		}
	}

	/*
	 * One leg from (x0, y0) to (x1, y1). Angled is a straight stroke; curved bows the way
	 * vexflow's does, leaving flat and turning up (a bend) or down (a release) into its end.
	 */
	private leg(x0: number, y0: number, x1: number, y1: number): void {
		const ctx = this.checkContext();
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		if (this.mark.shape === 'angled' || x0 === x1) {
			ctx.lineTo(x1, y1);
		} else {
			ctx.quadraticCurveTo(x1, y0, x1, y1);
		}
		ctx.stroke();
	}

	/* Where the legs start: off the fret's right side, as vexflow's Bend.draw has it. */
	private legStartX(note: TabNote): number {
		return (
			note.getModifierStartXY(Modifier.Position.RIGHT, this.index ?? 0).x + 3
		);
	}

	private legsWidth(): number {
		return this.phrase.reduce((sum, leg) => sum + (leg.drawWidth ?? 0), 0);
	}

	private glyphWidth(): number {
		return this.glyph?.getWidth() ?? 0;
	}

	/* The bar glyph's ink above and below its baseline; nothing when there is no glyph. */
	private glyphInk(): { ascent: number; descent: number } {
		const metrics = this.glyph?.getTextMetrics();
		return {
			ascent: metrics?.actualBoundingBoxAscent ?? 0,
			descent: metrics?.actualBoundingBoxDescent ?? 0,
		};
	}

	/*
	 * The fret line the legs leave from, the tip they reach (both from vexflow's Bend.draw),
	 * and the label's baseline: just over the tip, or over the bar glyph standing there.
	 */
	private heights(note: TabNote): {
		baseY: number;
		tipY: number;
		labelY: number;
	} {
		const spacing = note.checkStave().getSpacingBetweenLines();
		const lowestY = Math.min(...note.getYs());
		const baseY =
			note.getModifierStartXY(Modifier.Position.RIGHT, this.index ?? 0).y + 0.5;
		const tipY = lowestY - (this.textLine + 1) * spacing + 3;
		const { ascent, descent } = this.glyphInk();
		return { baseY, tipY, labelY: tipY - 4 - ascent - descent };
	}
}
