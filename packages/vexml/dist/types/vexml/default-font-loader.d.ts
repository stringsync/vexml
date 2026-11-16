import { type FontConfig, type FontFile } from './config.js';
import type { FontLoader, FontSample } from './font-loader.js';
export declare class DefaultFontLoader implements FontLoader {
    private readonly bravura;
    /** @param bravura the files to fetch Bravura from when the caller names no notation url:
     * outside tests, vexml's common subset first and the whole face behind it on the rest
     * (BRAVURA_COMMON_URL, BRAVURA_URL). */
    constructor(bravura: readonly FontFile[]);
    /** Inject the requested fonts, wait until they are resident, and return the resolved
     * family names. The family-name fallbacks are applied here, once, from
     * DEFAULT_FONT_CONFIG, callers (the CSS variables) and the VexFlow.setFonts call
     * below reuse the returned names instead of defaulting again. */
    load(container: HTMLElement, config?: FontConfig): Promise<{
        notation: string;
        text: string;
    }>;
    /** A face split by unicode-range loads each file on the first glyph it covers, and settle
     * waits only on the staples, so a rarer glyph (an ornament, a lyric's accented letter) may
     * have been measured in a fallback. Loading what the render measured and comparing each
     * matched face's status from before tells whether it was. */
    ensure(samples: readonly FontSample[]): Promise<boolean>;
    /** Wait until the resolved faces are resident, so layout never measures text against
     * fallback metrics. Chromium loads a face lazily on first use, and the pipeline
     * positions every text glyph (tab fret digits, part labels, annotations) by
     * measuring it; a cold face measures with substitute metrics and the glyphs land in
     * the wrong place once the real face arrives. Faces the loader can see
     * (@font-face injections, the Google Fonts link) sit in
     * document.fonts and are awaited directly; a bare family (FontOverride.url absent,
     * a system font) is invisible to the CSS Font Loading API, so it is forced resident
     * by measuring a probe span and waiting for the measurement to stop changing. */
    private settle;
    private injectNotationFont;
    private injectTextFont;
    private injectFiles;
    private injectGoogleFonts;
    /** The stylesheet defines the Source Sans 3 faces, so until it arrives document.fonts
     * has nothing to load and settle would measure against the fallback face. */
    private googleFontsSettled;
    private injectFontFace;
    private applyFontVariables;
}
