import { Affine } from './affine';
import type { PaintProbe, PathQuery } from './paint-probe';
import { PaintReplayer } from './paint-replayer';
import type { PaintProp, PaintState } from './paint-state';

/*
 * The production PaintProbe: a 1x1 canvas the recording asks what a real context would say. Text
 * metrics are cached by everything that shapes them, since an engraving measures the same few
 * glyphs (noteheads, accidentals, digits) tens of thousands of times.
 */
export class CanvasPaintProbe implements PaintProbe {
	private readonly ctx: CanvasRenderingContext2D;
	private readonly metrics = new Map<string, TextMetrics>();

	constructor() {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('vexml: 2D context unavailable');
		}
		this.ctx = ctx;
	}

	normalize(prop: PaintProp, value: unknown, current: unknown): unknown {
		const ctx = this.ctx as unknown as Record<PaintProp, unknown>;
		ctx[prop] = current;
		ctx[prop] = value;
		return ctx[prop];
	}

	measureText(state: PaintState, text: string): TextMetrics {
		const p = state.props;
		const key = `${p.font}|${p.letterSpacing}|${p.wordSpacing}|${p.fontKerning}|${p.fontStretch}|${p.fontVariantCaps}|${p.textRendering}|${p.direction}|${p.textAlign}|${p.textBaseline}|${text}`;
		let metrics = this.metrics.get(key);
		if (!metrics) {
			const ctx = this.ctx as unknown as Record<PaintProp, unknown>;
			for (const prop of TEXT_PROPS) {
				ctx[prop] = p[prop];
			}
			metrics = this.ctx.measureText(text);
			// Lyrics and words make the text open-ended; starting over is cheaper than an LRU.
			if (this.metrics.size >= MAX_CACHED_METRICS) {
				this.metrics.clear();
			}
			this.metrics.set(key, metrics);
		}
		return metrics;
	}

	isPointInPath(query: PathQuery): boolean {
		const { state, path, x, y, fillRule, stroke, scale } = query;
		const base = Affine.scale(scale);
		if (Array.isArray(path)) {
			// Replaying an op with no draw call builds the path and the state onto the probe.
			const replayer = new PaintReplayer(this.ctx, base, {
				scale,
				device: null,
			});
			replayer.replay({
				state,
				path,
				call: { kind: 'fillRect', x: 0, y: 0, w: 0, h: 0 },
				bounds: null,
			});
			const hit = stroke
				? this.ctx.isPointInStroke(x, y)
				: this.ctx.isPointInPath(x, y, fillRule);
			replayer.finish();
			return hit;
		}
		const m = base.multiply(state.matrix);
		this.ctx.save();
		this.ctx.lineWidth = state.props.lineWidth as number;
		this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
		const hit = stroke
			? this.ctx.isPointInStroke(path as Path2D, x, y)
			: this.ctx.isPointInPath(path as Path2D, x, y, fillRule);
		this.ctx.restore();
		return hit;
	}

	createLinearGradient(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
	): CanvasGradient {
		return this.ctx.createLinearGradient(x0, y0, x1, y1);
	}

	createRadialGradient(
		x0: number,
		y0: number,
		r0: number,
		x1: number,
		y1: number,
		r1: number,
	): CanvasGradient {
		return this.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
	}

	createConicGradient(
		startAngle: number,
		x: number,
		y: number,
	): CanvasGradient {
		return this.ctx.createConicGradient(startAngle, x, y);
	}

	createPattern(
		image: CanvasImageSource,
		repetition: string | null,
	): CanvasPattern | null {
		return this.ctx.createPattern(image, repetition);
	}

	createImageData(
		sw: number,
		sh: number,
		settings?: ImageDataSettings,
	): ImageData {
		return this.ctx.createImageData(sw, sh, settings);
	}
}

const MAX_CACHED_METRICS = 10_000;

const TEXT_PROPS: PaintProp[] = [
	'font',
	'letterSpacing',
	'wordSpacing',
	'fontKerning',
	'fontStretch',
	'fontVariantCaps',
	'textRendering',
	'direction',
	'textAlign',
	'textBaseline',
];
