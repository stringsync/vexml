import type { PathSegment } from './paint-op';
import type { PaintProp, PaintState } from './paint-state';

/* What a PaintContext asks a real 2D context, since recording one cannot answer on its own. */
export interface PaintProbe {
	/* The value a context holds after `prop = value`: normalized ('red' reads back '#ff0000'), or
	 * `current` when the browser would reject it. */
	normalize(prop: PaintProp, value: unknown, current: unknown): unknown;
	measureText(state: PaintState, text: string): TextMetrics;
	isPointInPath(query: PathQuery): boolean;
	createLinearGradient(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
	): CanvasGradient;
	createRadialGradient(
		x0: number,
		y0: number,
		r0: number,
		x1: number,
		y1: number,
		r1: number,
	): CanvasGradient;
	createConicGradient(startAngle: number, x: number, y: number): CanvasGradient;
	createPattern(
		image: CanvasImageSource,
		repetition: string | null,
	): CanvasPattern | null;
	createImageData(
		sw: number,
		sh: number,
		settings?: ImageDataSettings,
	): ImageData;
}

/* A hit test against the path a PaintContext holds, in its virtual bitmap's device pixels. */
export interface PathQuery {
	readonly state: PaintState;
	readonly path: readonly PathSegment[] | Path2D;
	readonly x: number;
	readonly y: number;
	readonly fillRule: CanvasFillRule;
	readonly stroke: boolean;
	readonly scale: number;
}
