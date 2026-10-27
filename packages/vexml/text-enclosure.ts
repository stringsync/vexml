import type { RenderContext } from 'vexflow/core';
import { Rect } from 'webappwiz/geometry';

/** The shapes MusicXML's `enclosure` attribute draws around text, `none` aside. */
export const ENCLOSURE_SHAPES = [
	'rectangle',
	'square',
	'oval',
	'circle',
	'bracket',
	'inverted-bracket',
	'triangle',
	'diamond',
	'pentagon',
	'hexagon',
	'heptagon',
	'octagon',
	'nonagon',
	'decagon',
] as const;

export type EnclosureShape = (typeof ENCLOSURE_SHAPES)[number];

const POLYGON_SIDES: Partial<Record<EnclosureShape, number>> = {
	pentagon: 5,
	hexagon: 6,
	heptagon: 7,
	octagon: 8,
	nonagon: 9,
	decagon: 10,
};

// How far a bracket's hooks reach back along the text, as a share of its height.
const BRACKET_HOOK = 0.25;

// The bezier handle length that makes four cubic arcs a circle (or, scaled, an ellipse).
const KAPPA = 0.5523;

/*
 * A shape drawn around a string of text: the box it takes, so the text and its enclosure
 * clear their neighbors as one, and the stroke itself. Every shape is sized to hold the
 * text box padded by `padding` on each side, and is centered on it.
 */
export class TextEnclosure {
	constructor(
		private readonly shape: EnclosureShape,
		private readonly padding: number,
	) {}

	/** The width and height the enclosure takes around a `w` × `h` text box. */
	size(w: number, h: number): { w: number; h: number } {
		const pw = w + 2 * this.padding;
		const ph = h + 2 * this.padding;
		const sides = POLYGON_SIDES[this.shape];
		if (sides) {
			// A regular polygon holds the padded box when its inscribed circle holds the box's
			// circumscribed one.
			const d = Math.hypot(pw, ph) / Math.cos(Math.PI / sides);
			return { w: d, h: d };
		}
		switch (this.shape) {
			case 'square': {
				const side = Math.max(pw, ph);
				return { w: side, h: side };
			}
			case 'circle': {
				const d = Math.hypot(pw, ph);
				return { w: d, h: d };
			}
			case 'oval':
				// The ellipse through the padded box's corners with the box's own proportions.
				return { w: pw * Math.SQRT2, h: ph * Math.SQRT2 };
			case 'triangle': {
				// An equilateral triangle standing on its base, the box sitting on that base.
				const base = pw + (2 * ph) / Math.sqrt(3);
				return { w: base, h: (base * Math.sqrt(3)) / 2 };
			}
			case 'diamond':
				return { w: 2 * pw, h: 2 * ph };
			default:
				return { w: pw, h: ph };
		}
	}

	/** Where the text box sits inside an enclosure occupying `outer`: centered, except in a
	 * triangle, where it sits on the base. */
	textBox(outer: Rect, w: number, h: number): Rect {
		const x = outer.x + (outer.w - w) / 2;
		if (this.shape === 'triangle') {
			return new Rect(x, outer.bottom - this.padding - h, w, h);
		}
		return new Rect(x, outer.y + (outer.h - h) / 2, w, h);
	}

	/** Stroke the enclosure filling `outer`, in the context's current stroke style. */
	draw(ctx: RenderContext, outer: Rect): void {
		const { x, y, w, h, right, bottom } = outer;
		const cx = x + w / 2;
		const cy = y + h / 2;
		ctx.beginPath();
		const sides = POLYGON_SIDES[this.shape];
		if (sides) {
			// Point up, the way a pentagon or triangle sign stands.
			for (let i = 0; i < sides; i++) {
				const angle = -Math.PI / 2 + (2 * Math.PI * i) / sides;
				const px = cx + (w / 2) * Math.cos(angle);
				const py = cy + (h / 2) * Math.sin(angle);
				if (i === 0) {
					ctx.moveTo(px, py);
				} else {
					ctx.lineTo(px, py);
				}
			}
			ctx.closePath();
			ctx.stroke();
			return;
		}
		switch (this.shape) {
			case 'oval':
			case 'circle': {
				const kx = (w / 2) * KAPPA;
				const ky = (h / 2) * KAPPA;
				ctx.moveTo(x, cy);
				ctx.bezierCurveTo(x, cy - ky, cx - kx, y, cx, y);
				ctx.bezierCurveTo(cx + kx, y, right, cy - ky, right, cy);
				ctx.bezierCurveTo(right, cy + ky, cx + kx, bottom, cx, bottom);
				ctx.bezierCurveTo(cx - kx, bottom, x, cy + ky, x, cy);
				ctx.closePath();
				break;
			}
			case 'triangle':
				ctx.moveTo(cx, y);
				ctx.lineTo(right, bottom);
				ctx.lineTo(x, bottom);
				ctx.closePath();
				break;
			case 'diamond':
				ctx.moveTo(cx, y);
				ctx.lineTo(right, cy);
				ctx.lineTo(cx, bottom);
				ctx.lineTo(x, cy);
				ctx.closePath();
				break;
			case 'bracket':
			case 'inverted-bracket': {
				// A bracket's hooks point down at the text it heads; an inverted one's point up.
				const hook = h * BRACKET_HOOK;
				const edge = this.shape === 'bracket' ? y : bottom;
				const tip = this.shape === 'bracket' ? y + hook : bottom - hook;
				ctx.moveTo(x, tip);
				ctx.lineTo(x, edge);
				ctx.lineTo(right, edge);
				ctx.lineTo(right, tip);
				break;
			}
			default:
				ctx.moveTo(x, y);
				ctx.lineTo(right, y);
				ctx.lineTo(right, bottom);
				ctx.lineTo(x, bottom);
				ctx.closePath();
		}
		ctx.stroke();
	}
}
