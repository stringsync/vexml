import type { Rect } from '../core/geometry/index.js';
import type { Affine } from './affine.js';
import type { PaintState } from './paint-state.js';
import type { TextOutline } from './text-outline.js';
/** Identity of the notation that emitted an op, local to one recording. The replay ignores it. */
export interface PaintElement {
    readonly id: number;
    readonly kind: string;
    readonly parent?: number;
    readonly ancestors?: readonly number[];
}
export interface PaintOp {
    readonly element?: PaintElement;
    readonly state: PaintState;
    readonly path: readonly PathSegment[] | null;
    readonly call: PaintCall;
    readonly bounds: Rect | null;
}
export interface PathSegment {
    readonly kind: PathKind;
    readonly args: readonly unknown[];
    readonly matrix: Affine;
}
export type PathKind = 'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'bezierCurveTo' | 'arc' | 'arcTo' | 'ellipse' | 'rect' | 'roundRect' | 'closePath';
export type PaintCall = {
    kind: 'fill';
    fillRule?: CanvasFillRule;
    path2d?: Path2D;
} | {
    kind: 'stroke';
    path2d?: Path2D;
} | {
    kind: 'fillRect' | 'strokeRect' | 'clearRect';
    x: number;
    y: number;
    w: number;
    h: number;
} | {
    kind: 'fillText' | 'strokeText';
    text: string;
    x: number;
    y: number;
    maxWidth?: number;
    outline?: TextOutline;
} | {
    kind: 'drawImage';
    image: CanvasImageSource;
    args: readonly number[];
} | {
    kind: 'putImageData';
    data: ImageData;
    args: readonly number[];
};
