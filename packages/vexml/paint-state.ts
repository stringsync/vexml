import type { Rect } from 'webappwiz/geometry';
import { Affine } from './affine';
import type { PathSegment } from './paint-op';

// What a fresh canvas context holds, per the HTML spec. Declared as a value so PaintProp is
// exactly these keys, and above the class because INITIAL reads it as the class is defined.
const DEFAULT_PROPS = {
	fillStyle: '#000000' as unknown,
	strokeStyle: '#000000' as unknown,
	globalAlpha: 1 as unknown,
	globalCompositeOperation: 'source-over' as unknown,
	lineWidth: 1 as unknown,
	lineCap: 'butt' as unknown,
	lineJoin: 'miter' as unknown,
	miterLimit: 10 as unknown,
	lineDashOffset: 0 as unknown,
	shadowOffsetX: 0 as unknown,
	shadowOffsetY: 0 as unknown,
	shadowBlur: 0 as unknown,
	shadowColor: 'rgba(0, 0, 0, 0)' as unknown,
	font: '10px sans-serif' as unknown,
	textAlign: 'start' as unknown,
	textBaseline: 'alphabetic' as unknown,
	direction: 'inherit' as unknown,
	filter: 'none' as unknown,
	imageSmoothingEnabled: true as unknown,
	imageSmoothingQuality: 'low' as unknown,
	letterSpacing: '0px' as unknown,
	wordSpacing: '0px' as unknown,
	fontKerning: 'auto' as unknown,
	fontStretch: 'normal' as unknown,
	fontVariantCaps: 'normal' as unknown,
	textRendering: 'auto' as unknown,
};

/* The 2D context's plain settable state, by its property name. */
export type PaintProp = keyof typeof DEFAULT_PROPS;

export type PaintProps = { readonly [K in PaintProp]: unknown };

/* A clip in effect: the path it was cut from (or the caller's Path2D) and, when that path is one
 * axis-aligned rectangle, the box it reduces to. */
export interface Clip {
	readonly path: readonly PathSegment[] | Path2D;
	readonly matrix: Affine;
	readonly fillRule: CanvasFillRule;
	readonly rect: Rect | null;
}

/*
 * A snapshot of everything a 2D context carries between draws: the styles, the transform, the
 * clips and the dash. Immutable, so every recorded op can share the snapshot it was drawn under
 * and save()/restore() are a stack of references. A replay compares snapshots by reference and
 * re-applies only on a change.
 */
export class PaintState {
	static readonly INITIAL = new PaintState(
		DEFAULT_PROPS,
		Affine.IDENTITY,
		[],
		[],
	);

	private constructor(
		readonly props: PaintProps,
		readonly matrix: Affine,
		readonly clips: readonly Clip[],
		readonly lineDash: readonly number[],
	) {}

	with(prop: PaintProp, value: unknown): PaintState {
		if (this.props[prop] === value) {
			return this;
		}
		return new PaintState(
			{ ...this.props, [prop]: value },
			this.matrix,
			this.clips,
			this.lineDash,
		);
	}

	withMatrix(matrix: Affine): PaintState {
		return new PaintState(this.props, matrix, this.clips, this.lineDash);
	}

	withClip(clip: Clip): PaintState {
		return new PaintState(
			this.props,
			this.matrix,
			[...this.clips, clip],
			this.lineDash,
		);
	}

	withLineDash(lineDash: readonly number[]): PaintState {
		return new PaintState(this.props, this.matrix, this.clips, lineDash);
	}
}

export const PAINT_PROPS = Object.keys(DEFAULT_PROPS) as PaintProp[];
