import type { PathSegment } from './paint-op.js';
import type { PaintProp, PaintState } from './paint-state.js';
export interface PaintProbe {
    normalize(prop: PaintProp, value: unknown, current: unknown): unknown;
    measureText(state: PaintState, text: string): TextMetrics;
    forget(): void;
    isPointInPath(query: PathQuery): boolean;
    createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
    createConicGradient(startAngle: number, x: number, y: number): CanvasGradient;
    createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null;
    createImageData(sw: number, sh: number, settings?: ImageDataSettings): ImageData;
}
export interface PathQuery {
    readonly state: PaintState;
    readonly path: readonly PathSegment[] | Path2D;
    readonly x: number;
    readonly y: number;
    readonly fillRule: CanvasFillRule;
    readonly stroke: boolean;
    readonly scale: number;
}
