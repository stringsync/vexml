import { type Glyph, type GlyphRun } from 'fontkit';
export declare class OutlineFace {
    readonly family: string;
    private readonly font;
    readonly weight: number;
    readonly italic: boolean;
    private readonly runs;
    private constructor();
    static read(family: string, data: Uint8Array): OutlineFace | null;
    get unitsPerEm(): number;
    has(codePoint: number): boolean;
    layout(text: string): GlyphRun;
    glyph(id: number): Glyph;
}
