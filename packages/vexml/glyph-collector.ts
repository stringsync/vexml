import type { FontSample } from './font-loader';
import { FontSamples } from './font-samples';
import type { PaintProbe, PathQuery } from './paint-probe';
import type { PaintProp, PaintState } from './paint-state';

/*
 * A PaintProbe that answers through another and notes every character it measures, by the CSS
 * font it measured it in. Everything a render lays out or draws in a font is measured first
 * (vexflow measures each glyph as it builds it, vexml its text as it places it), so what this
 * saw is what the render needs resident, for a FontLoader to ensure.
 */
export class GlyphCollector implements PaintProbe {
	private readonly seen = new FontSamples();

	constructor(private readonly probe: PaintProbe) {}

	/* What it measured, one sample per font. */
	samples(): FontSample[] {
		return this.seen.list();
	}

	normalize(prop: PaintProp, value: unknown, current: unknown): unknown {
		return this.probe.normalize(prop, value, current);
	}

	measureText(state: PaintState, text: string): TextMetrics {
		this.seen.add(String(state.props.font), text);
		return this.probe.measureText(state, text);
	}

	forget(): void {
		this.probe.forget();
	}

	isPointInPath(query: PathQuery): boolean {
		return this.probe.isPointInPath(query);
	}

	createLinearGradient(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
	): CanvasGradient {
		return this.probe.createLinearGradient(x0, y0, x1, y1);
	}

	createRadialGradient(
		x0: number,
		y0: number,
		r0: number,
		x1: number,
		y1: number,
		r1: number,
	): CanvasGradient {
		return this.probe.createRadialGradient(x0, y0, r0, x1, y1, r1);
	}

	createConicGradient(
		startAngle: number,
		x: number,
		y: number,
	): CanvasGradient {
		return this.probe.createConicGradient(startAngle, x, y);
	}

	createPattern(
		image: CanvasImageSource,
		repetition: string | null,
	): CanvasPattern | null {
		return this.probe.createPattern(image, repetition);
	}

	createImageData(
		sw: number,
		sh: number,
		settings?: ImageDataSettings,
	): ImageData {
		return this.probe.createImageData(sw, sh, settings);
	}
}
