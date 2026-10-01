import type { Rect } from 'webappwiz/geometry';
import type { Affine } from './affine';
import type { PaintState } from './paint-state';

/*
 * One recorded draw: everything a replay needs to put the same pixels on any canvas, plus the
 * box those pixels can land in. A tiled surface files each op under the tiles its box touches and
 * replays only those, so the box must hold every pixel the op can touch (it may hold more).
 */
export interface PaintOp {
	readonly state: PaintState;
	// The path rebuilt before a fill or stroke of the current path; null for the calls that draw
	// without one (fillRect, fillText, drawImage, ...).
	readonly path: readonly PathSegment[] | null;
	readonly call: PaintCall;
	// In recorded space. Null when the op can reach anywhere: a filter, a compositing mode that
	// erases outside the shape, a Path2D the recorder cannot look inside.
	readonly bounds: Rect | null;
}

/* One path-building call, kept with the transform it was made under: the canvas maps each
 * segment through the transform current when it was added, not the one current at fill. */
export interface PathSegment {
	readonly kind: PathKind;
	readonly args: readonly unknown[];
	readonly matrix: Affine;
}

export type PathKind =
	| 'moveTo'
	| 'lineTo'
	| 'quadraticCurveTo'
	| 'bezierCurveTo'
	| 'arc'
	| 'arcTo'
	| 'ellipse'
	| 'rect'
	| 'roundRect'
	| 'closePath';

export type PaintCall =
	| { kind: 'fill'; fillRule?: CanvasFillRule; path2d?: Path2D }
	| { kind: 'stroke'; path2d?: Path2D }
	| {
			kind: 'fillRect' | 'strokeRect' | 'clearRect';
			x: number;
			y: number;
			w: number;
			h: number;
	  }
	| {
			kind: 'fillText' | 'strokeText';
			text: string;
			x: number;
			y: number;
			maxWidth?: number;
	  }
	| { kind: 'drawImage'; image: CanvasImageSource; args: readonly number[] }
	// Device pixels of the surface's virtual full-size bitmap, which ignores transform, clip and
	// every style, as putImageData does.
	| { kind: 'putImageData'; data: ImageData; args: readonly number[] };
