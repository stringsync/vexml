import type { GlyphRun } from 'fontkit';
import type { CssFont } from './css-font.js';
import type { OutlineFace } from './outline-face.js';
export interface PlacedRun {
    readonly face: OutlineFace;
    readonly run: GlyphRun;
    readonly pens: readonly number[];
    readonly scale: number;
}
export declare class OutlineFonts {
    private readonly faces;
    constructor(faces: readonly OutlineFace[]);
    layout(font: CssFont, text: string): {
        runs: PlacedRun[];
        width: number;
    } | null;
    private faceFor;
    private match;
}
