import { Rect } from 'webappwiz/geometry';
import { Affine } from './affine';
import type { PaintCall, PaintOp, PathKind, PathSegment } from './paint-op';
import type { PaintProbe } from './paint-probe';
import type { PaintSink } from './paint-sink';
import {
	type Clip,
	PAINT_PROPS,
	type PaintProp,
	PaintState,
} from './paint-state';

/*
 * A CanvasRenderingContext2D that draws nowhere: each draw call becomes a PaintOp, carrying the
 * state it was made under and the box it can touch, handed to a sink. A canvas bitmap is capped
 * per side and in area, so a score longer than the cap can't be one; recorded ops can be replayed
 * into as many small tiles as the score needs, now or whenever a tile scrolls into view.
 *
 * It stands in for the real type at the seam (`as unknown as CanvasRenderingContext2D`): the full
 * 2D API, including the readbacks, which are answered by the sink (getImageData) or a probe
 * context (measureText, isPointInPath, gradients). The settable properties are defined on the
 * prototype below the class.
 */
export class PaintContext {
	private state = PaintState.INITIAL;
	private readonly stack: PaintState[] = [];
	private path: PathSegment[] = [];
	// The current path's box in recorded space, grown as segments are added so a fill doesn't
	// re-walk the path. `unbounded` once a segment's reach can't be boxed (arcTo).
	private box = EMPTY_BOX;
	private unbounded = false;

	constructor(
		private readonly sink: PaintSink,
		private readonly probe: PaintProbe,
		// What `ctx.canvas` reads. vexflow reads it once (and only touches it on resize/clear, which
		// vexml never calls); a layer's caller gets the element the layer is drawn in.
		readonly canvas: unknown,
	) {}

	getProp(prop: PaintProp): unknown {
		return this.state.props[prop];
	}

	setProp(prop: PaintProp, value: unknown): void {
		const current = this.state.props[prop];
		this.state = this.state.with(
			prop,
			this.probe.normalize(prop, value, current),
		);
	}

	save(): void {
		this.stack.push(this.state);
	}

	restore(): void {
		this.state = this.stack.pop() ?? this.state;
	}

	reset(): void {
		this.state = PaintState.INITIAL;
		this.stack.length = 0;
		this.beginPath();
		this.sink.reset();
	}

	isContextLost(): boolean {
		return false;
	}

	getContextAttributes(): CanvasRenderingContext2DSettings {
		return {
			alpha: true,
			colorSpace: 'srgb',
			desynchronized: false,
			willReadFrequently: false,
		};
	}

	scale(x: number, y: number): void {
		this.transform(x, 0, 0, y, 0, 0);
	}

	rotate(angle: number): void {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		this.transform(cos, sin, -sin, cos, 0, 0);
	}

	translate(x: number, y: number): void {
		this.transform(1, 0, 0, 1, x, y);
	}

	transform(
		a: number,
		b: number,
		c: number,
		d: number,
		e: number,
		f: number,
	): void {
		if (!finite(a, b, c, d, e, f)) {
			return;
		}
		this.state = this.state.withMatrix(
			this.state.matrix.multiply(new Affine(a, b, c, d, e, f)),
		);
	}

	setTransform(
		a?: number | DOMMatrix2DInit,
		b?: number,
		c?: number,
		d?: number,
		e?: number,
		f?: number,
	): void {
		const matrix =
			typeof a === 'number'
				? new Affine(a, b ?? 0, c ?? 0, d ?? 0, e ?? 0, f ?? 0)
				: fromInit(a ?? {});
		if (!finite(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)) {
			return;
		}
		this.state = this.state.withMatrix(matrix);
	}

	getTransform(): DOMMatrix {
		const m = this.state.matrix;
		return new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]);
	}

	resetTransform(): void {
		this.state = this.state.withMatrix(Affine.IDENTITY);
	}

	setLineDash(segments: number[]): void {
		if (segments.some((s) => !Number.isFinite(s) || s < 0)) {
			return;
		}
		// An odd list repeats to even, as the spec has the canvas do.
		const dash =
			segments.length % 2 ? [...segments, ...segments] : [...segments];
		this.state = this.state.withLineDash(dash);
	}

	getLineDash(): number[] {
		return [...this.state.lineDash];
	}

	beginPath(): void {
		this.path = [];
		this.box = EMPTY_BOX;
		this.unbounded = false;
	}

	closePath(): void {
		this.segment('closePath', []);
	}

	moveTo(x: number, y: number): void {
		if (this.segment('moveTo', [x, y])) {
			this.extend(x, y, x, y);
		}
	}

	lineTo(x: number, y: number): void {
		if (this.segment('lineTo', [x, y])) {
			this.extend(x, y, x, y);
		}
	}

	quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
		// A Bezier never leaves the hull of its control points, so their box holds the curve.
		if (this.segment('quadraticCurveTo', [cpx, cpy, x, y])) {
			this.extend(cpx, cpy, cpx, cpy);
			this.extend(x, y, x, y);
		}
	}

	bezierCurveTo(
		cp1x: number,
		cp1y: number,
		cp2x: number,
		cp2y: number,
		x: number,
		y: number,
	): void {
		if (this.segment('bezierCurveTo', [cp1x, cp1y, cp2x, cp2y, x, y])) {
			this.extend(cp1x, cp1y, cp1x, cp1y);
			this.extend(cp2x, cp2y, cp2x, cp2y);
			this.extend(x, y, x, y);
		}
	}

	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		counterclockwise?: boolean,
	): void {
		if (
			this.segment('arc', [
				x,
				y,
				radius,
				startAngle,
				endAngle,
				counterclockwise,
			])
		) {
			this.extend(x - radius, y - radius, x + radius, y + radius);
		}
	}

	arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
		// The arc's second tangent point sits on the infinite line through (x1, y1) and (x2, y2),
		// arbitrarily far out for a nearly straight corner: no finite box is safe.
		if (this.segment('arcTo', [x1, y1, x2, y2, radius])) {
			this.unbounded = true;
		}
	}

	ellipse(
		x: number,
		y: number,
		radiusX: number,
		radiusY: number,
		rotation: number,
		startAngle: number,
		endAngle: number,
		counterclockwise?: boolean,
	): void {
		const args = [
			x,
			y,
			radiusX,
			radiusY,
			rotation,
			startAngle,
			endAngle,
			counterclockwise,
		];
		if (this.segment('ellipse', args)) {
			const r = Math.max(radiusX, radiusY);
			this.extend(x - r, y - r, x + r, y + r);
		}
	}

	rect(x: number, y: number, w: number, h: number): void {
		if (this.segment('rect', [x, y, w, h])) {
			this.extend(x, y, x + w, y + h);
		}
	}

	roundRect(
		x: number,
		y: number,
		w: number,
		h: number,
		radii?: number | DOMPointInit | (number | DOMPointInit)[],
	): void {
		if (this.segment('roundRect', [x, y, w, h, radii])) {
			this.extend(x, y, x + w, y + h);
		}
	}

	fill(pathOrRule?: Path2D | CanvasFillRule, fillRule?: CanvasFillRule): void {
		if (isPath2D(pathOrRule)) {
			this.emit(null, { kind: 'fill', path2d: pathOrRule, fillRule }, null);
			return;
		}
		const box = this.pathBox();
		if (box !== undefined) {
			this.emit(
				this.path.slice(),
				{ kind: 'fill', fillRule: pathOrRule },
				box && this.reach(box, 0),
			);
		}
	}

	stroke(path?: Path2D): void {
		if (isPath2D(path)) {
			this.emit(null, { kind: 'stroke', path2d: path }, null);
			return;
		}
		const box = this.pathBox();
		if (box !== undefined) {
			this.emit(
				this.path.slice(),
				{ kind: 'stroke' },
				box && this.reach(box, this.strokeReach()),
			);
		}
	}

	clip(pathOrRule?: Path2D | CanvasFillRule, fillRule?: CanvasFillRule): void {
		const clip: Clip = isPath2D(pathOrRule)
			? {
					path: pathOrRule,
					matrix: this.state.matrix,
					fillRule: fillRule ?? 'nonzero',
					rect: null,
				}
			: {
					path: this.path.slice(),
					matrix: this.state.matrix,
					fillRule: pathOrRule ?? 'nonzero',
					rect: rectOf(this.path),
				};
		this.state = this.state.withClip(clip);
	}

	isPointInPath(
		a: Path2D | number,
		b: number,
		c?: number | CanvasFillRule,
		d?: CanvasFillRule,
	): boolean {
		const [path, x, y, fillRule] = isPath2D(a)
			? [a, b, c as number, d]
			: [this.path, a, b, c as CanvasFillRule | undefined];
		return this.probe.isPointInPath({
			state: this.state,
			path,
			x,
			y,
			fillRule: fillRule ?? 'nonzero',
			stroke: false,
			scale: this.sink.scale,
		});
	}

	isPointInStroke(a: Path2D | number, b: number, c?: number): boolean {
		const [path, x, y] = isPath2D(a) ? [a, b, c as number] : [this.path, a, b];
		return this.probe.isPointInPath({
			state: this.state,
			path,
			x,
			y,
			fillRule: 'nonzero',
			stroke: true,
			scale: this.sink.scale,
		});
	}

	drawFocusIfNeeded(): void {
		// A focus ring is for a canvas's fallback content, which a tiled surface has none of.
	}

	fillRect(x: number, y: number, w: number, h: number): void {
		if (finite(x, y, w, h) && w !== 0 && h !== 0) {
			const box = this.state.matrix.mapBox(x, y, x + w, y + h);
			this.emit(null, { kind: 'fillRect', x, y, w, h }, this.reach(box, 0));
		}
	}

	strokeRect(x: number, y: number, w: number, h: number): void {
		if (finite(x, y, w, h)) {
			const box = this.state.matrix.mapBox(x, y, x + w, y + h);
			this.emit(
				null,
				{ kind: 'strokeRect', x, y, w, h },
				this.reach(box, this.strokeReach()),
			);
		}
	}

	clearRect(x: number, y: number, w: number, h: number): void {
		if (finite(x, y, w, h) && w !== 0 && h !== 0) {
			// Clearing ignores compositing, shadows and filters, so only the clip narrows it.
			const box = this.clipped(
				grow(this.state.matrix.mapBox(x, y, x + w, y + h), 1),
			);
			if (box) {
				this.sink.paint({
					state: this.state,
					path: null,
					call: { kind: 'clearRect', x, y, w, h },
					bounds: box,
				});
			}
		}
	}

	fillText(text: string, x: number, y: number, maxWidth?: number): void {
		this.text('fillText', text, x, y, maxWidth);
	}

	strokeText(text: string, x: number, y: number, maxWidth?: number): void {
		this.text('strokeText', text, x, y, maxWidth);
	}

	measureText(text: string): TextMetrics {
		return this.probe.measureText(this.state, text);
	}

	drawImage(image: CanvasImageSource, ...args: number[]): void {
		if (!finite(...args)) {
			return;
		}
		const dest = destOf(image, args);
		if (dest === undefined) {
			return;
		}
		const box =
			dest &&
			this.state.matrix.mapBox(
				dest[0],
				dest[1],
				dest[0] + dest[2],
				dest[1] + dest[3],
			);
		this.emit(
			null,
			{ kind: 'drawImage', image, args },
			box && this.reach(box, 0),
		);
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
		a: number | ImageData,
		b?: number,
		settings?: ImageDataSettings,
	): ImageData {
		return typeof a === 'number'
			? this.probe.createImageData(a, b ?? 0, settings)
			: this.probe.createImageData(a.width, a.height);
	}

	getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
		return this.sink.read(sx, sy, sw, sh);
	}

	putImageData(data: ImageData, ...args: number[]): void {
		if (!finite(...args) || (args.length !== 2 && args.length !== 6)) {
			return;
		}
		const [
			dx = 0,
			dy = 0,
			dirtyX = 0,
			dirtyY = 0,
			dirtyW = data.width,
			dirtyH = data.height,
		] = args;
		const s = this.sink.scale;
		const box = new Rect(dx + dirtyX, dy + dirtyY, dirtyW, dirtyH);
		this.sink.paint({
			state: this.state,
			path: null,
			call: { kind: 'putImageData', data, args },
			bounds: grow(new Rect(box.x / s, box.y / s, box.w / s, box.h / s), 1),
		});
	}

	private text(
		kind: 'fillText' | 'strokeText',
		text: string,
		x: number,
		y: number,
		maxWidth?: number,
	): void {
		if (!finite(x, y) || (maxWidth !== undefined && !(maxWidth > 0))) {
			return;
		}
		const m = this.probe.measureText(this.state, text);
		const ascent = m.actualBoundingBoxAscent;
		const descent = m.actualBoundingBoxDescent;
		// The measured ink box, padded for hinting and antialiasing that can spill past it. A
		// maxWidth only ever squeezes the text, so the unsqueezed box still holds it.
		const pad = 2 + 0.1 * (ascent + descent);
		const box = this.state.matrix.mapBox(
			x - m.actualBoundingBoxLeft - pad,
			y - ascent - pad,
			x + m.actualBoundingBoxRight + pad,
			y + descent + pad,
		);
		this.emit(
			null,
			{ kind, text, x, y, maxWidth },
			this.reach(box, kind === 'strokeText' ? this.strokeReach() : 0),
		);
	}

	private emit(
		path: PathSegment[] | null,
		call: PaintCall,
		box: Rect | null,
	): void {
		const props = this.state.props;
		// A filter can blur anywhere, and these modes erase everything outside the shape too.
		const anywhere =
			props.filter !== 'none' ||
			ERASING.has(props.globalCompositeOperation as string);
		let bounds: Rect | null = null;
		if (box && !anywhere) {
			bounds = this.clipped(box);
			if (!bounds) {
				return;
			}
		}
		const op: PaintOp = { state: this.state, path, call, bounds };
		this.sink.paint(op);
	}

	// How far past its geometry an op can paint: the stroke, antialiasing, and the shadow.
	private reach(box: Rect, stroke: number): Rect {
		const props = this.state.props;
		let pad = 1 + stroke;
		if (props.shadowColor !== CLEAR_SHADOW) {
			// Shadow offsets and blur are in bitmap pixels, never more than the CSS pixels they're
			// added to here, so the pad stays an overestimate at any scale.
			const offset = Math.max(
				Math.abs(props.shadowOffsetX as number),
				Math.abs(props.shadowOffsetY as number),
			);
			pad += offset + 3 * (props.shadowBlur as number);
		}
		return grow(box, pad);
	}

	private strokeReach(): number {
		const props = this.state.props;
		const join = props.lineJoin === 'miter' ? (props.miterLimit as number) : 1;
		const cap = props.lineCap === 'square' ? Math.SQRT2 : 1;
		return (
			((props.lineWidth as number) / 2) *
			this.state.matrix.maxScale *
			Math.max(join, cap, 1)
		);
	}

	// Narrow a box to the rectangular clips in effect; null when nothing is left to paint. A clip
	// of any other shape is skipped, which only leaves the box larger than it need be.
	private clipped(box: Rect): Rect | null {
		let result: Rect | null = box;
		for (const clip of this.state.clips) {
			if (clip.rect) {
				result = result.intersection(clip.rect);
				if (!result) {
					return null;
				}
			}
		}
		return result;
	}

	// undefined for an empty path (a fill paints nothing), null when the path can't be boxed.
	private pathBox(): Rect | null | undefined {
		if (this.path.length === 0) {
			return undefined;
		}
		if (this.unbounded) {
			return null;
		}
		return this.box.minX > this.box.maxX
			? undefined
			: new Rect(
					this.box.minX,
					this.box.minY,
					this.box.maxX - this.box.minX,
					this.box.maxY - this.box.minY,
				);
	}

	// The canvas silently ignores a path call with a non-finite number; so does the recording.
	private segment(kind: PathKind, args: unknown[]): boolean {
		if (args.some((a) => typeof a === 'number' && !Number.isFinite(a))) {
			return false;
		}
		this.path.push({ kind, args, matrix: this.state.matrix });
		return true;
	}

	private extend(x0: number, y0: number, x1: number, y1: number): void {
		const r = this.state.matrix.mapBox(x0, y0, x1, y1);
		this.box = {
			minX: Math.min(this.box.minX, r.x),
			minY: Math.min(this.box.minY, r.y),
			maxX: Math.max(this.box.maxX, r.x + r.w),
			maxY: Math.max(this.box.maxY, r.y + r.h),
		};
	}
}

for (const prop of PAINT_PROPS) {
	Object.defineProperty(PaintContext.prototype, prop, {
		get(this: PaintContext) {
			return this.getProp(prop);
		},
		set(this: PaintContext, value: unknown) {
			this.setProp(prop, value);
		},
	});
}

const EMPTY_BOX = {
	minX: Infinity,
	minY: Infinity,
	maxX: -Infinity,
	maxY: -Infinity,
};

const CLEAR_SHADOW = 'rgba(0, 0, 0, 0)';

const ERASING = new Set([
	'copy',
	'source-in',
	'source-out',
	'destination-in',
	'destination-atop',
]);

function finite(...values: number[]): boolean {
	return values.every(Number.isFinite);
}

function isPath2D(value: unknown): value is Path2D {
	return typeof Path2D !== 'undefined' && value instanceof Path2D;
}

function fromInit(init: DOMMatrix2DInit): Affine {
	return new Affine(
		init.a ?? init.m11 ?? 1,
		init.b ?? init.m12 ?? 0,
		init.c ?? init.m21 ?? 0,
		init.d ?? init.m22 ?? 1,
		init.e ?? init.m41 ?? 0,
		init.f ?? init.m42 ?? 0,
	);
}

// The box a path is exactly, when it is one rectangle under a transform that keeps it one.
function rectOf(path: readonly PathSegment[]): Rect | null {
	const [only] = path;
	if (
		path.length !== 1 ||
		!only ||
		only.kind !== 'rect' ||
		!only.matrix.isAxisAligned
	) {
		return null;
	}
	const [x = 0, y = 0, w = 0, h = 0] = only.args as number[];
	return only.matrix.mapBox(x, y, x + w, y + h);
}

// Where drawImage's arguments put the image: (dx, dy, dw, dh), null when its size can't be read,
// undefined for an argument count the canvas rejects.
function destOf(
	image: CanvasImageSource,
	args: readonly number[],
): [number, number, number, number] | null | undefined {
	const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0] = args;
	switch (args.length) {
		case 2: {
			const size = sizeOf(image);
			return size && [a, b, size.width, size.height];
		}
		case 4:
			return [a, b, c, d];
		case 8:
			return [e, f, g, h];
		default:
			return undefined;
	}
}

function sizeOf(
	image: CanvasImageSource,
): { width: number; height: number } | null {
	const source = image as unknown as Record<string, unknown>;
	for (const [w, h] of [
		['naturalWidth', 'naturalHeight'],
		['videoWidth', 'videoHeight'],
		['displayWidth', 'displayHeight'],
		['width', 'height'],
	] as const) {
		const width = source[w];
		const height = source[h];
		if (typeof width === 'number' && typeof height === 'number') {
			return { width, height };
		}
	}
	return null;
}

function grow(box: Rect, by: number): Rect {
	return new Rect(box.x - by, box.y - by, box.w + 2 * by, box.h + 2 * by);
}
