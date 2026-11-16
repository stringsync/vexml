import type { Rect } from '../core/geometry/index.js';
import { Affine } from './affine.js';
import type { PathSegment } from './paint-op.js';
declare const DEFAULT_PROPS: {
    fillStyle: unknown;
    strokeStyle: unknown;
    globalAlpha: unknown;
    globalCompositeOperation: unknown;
    lineWidth: unknown;
    lineCap: unknown;
    lineJoin: unknown;
    miterLimit: unknown;
    lineDashOffset: unknown;
    shadowOffsetX: unknown;
    shadowOffsetY: unknown;
    shadowBlur: unknown;
    shadowColor: unknown;
    font: unknown;
    textAlign: unknown;
    textBaseline: unknown;
    direction: unknown;
    filter: unknown;
    imageSmoothingEnabled: unknown;
    imageSmoothingQuality: unknown;
    letterSpacing: unknown;
    wordSpacing: unknown;
    fontKerning: unknown;
    fontStretch: unknown;
    fontVariantCaps: unknown;
    textRendering: unknown;
};
export type PaintProp = keyof typeof DEFAULT_PROPS;
export type PaintProps = {
    readonly [K in PaintProp]: unknown;
};
export interface Clip {
    readonly path: readonly PathSegment[] | Path2D;
    readonly matrix: Affine;
    readonly fillRule: CanvasFillRule;
    readonly rect: Rect | null;
}
export declare class PaintState {
    readonly props: PaintProps;
    readonly matrix: Affine;
    readonly clips: readonly Clip[];
    readonly lineDash: readonly number[];
    static readonly INITIAL: PaintState;
    private constructor();
    static of(props: PaintProps, matrix: Affine, clips: readonly Clip[], lineDash: readonly number[]): PaintState;
    with(prop: PaintProp, value: unknown): PaintState;
    withMatrix(matrix: Affine): PaintState;
    withClip(clip: Clip): PaintState;
    withLineDash(lineDash: readonly number[]): PaintState;
}
export declare const PAINT_PROPS: PaintProp[];
export {};
