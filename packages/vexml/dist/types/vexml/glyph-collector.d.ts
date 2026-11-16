import type { FontSample } from './font-loader.js';
import type { PaintProbe, PathQuery } from './paint-probe.js';
import type { PaintProp, PaintState } from './paint-state.js';
export declare class GlyphCollector implements PaintProbe {
    private readonly probe;
    private readonly seen;
    constructor(probe: PaintProbe);
    samples(): FontSample[];
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
