import { type FontConfig } from './config.js';
/**
 * The notation and text family names a font config resolves to, with the DEFAULT_FONT_CONFIG
 * fallbacks applied and every name made safe to put in a quoted CSS string.
 */
export declare class FontFamilies {
    readonly notation: string;
    readonly text: string;
    constructor(config?: FontConfig);
    get notationStack(): string;
    get textStack(): string;
    /**
     * A MusicXML font-family (a comma-separated list of faces) as a CSS font-family list that
     * falls back to `fallback`, the configured face, for a face the browser lacks: "Times New
     * Roman,serif" over the text stack is `'Times New Roman', serif, 'Source Sans 3',
     * sans-serif`. MusicXML's own generic names (music, engraved, handwritten) name no CSS
     * face, so they drop out; `fallback` alone when nothing is left.
     */
    static documentStack(family: string | null, fallback: string): string;
    /**
     * Make a font family or url safe to interpolate into a quoted CSS string, so it can't
     * break out of its quotes and inject rules. Spaces stay, so names like "Source Sans 3"
     * survive.
     */
    static sanitize(value: string): string;
}
