import { type FontConfig } from './config.js';
import { FontFamilies } from './font-families.js';
/** A font createSnapshot measures and outlines text with: its bytes, or the path or file URL
 * to read them from. `family` is the name the config's fonts use for it. */
export interface HeadlessFont {
    family: string;
    source: string | URL | Uint8Array | ArrayBuffer;
}
/** A canvas library's font registry, where createSnapshot registers each font under its
 * family so the canvas measures text in it. @napi-rs/canvas's `GlobalFonts` is one as it
 * is; wrap another library's in an object with this method. */
export interface FontRegistry {
    register(data: Uint8Array, family: string): unknown;
}
export interface LoadedFont {
    readonly family: string;
    readonly data: Uint8Array;
}
export declare class HeadlessFonts {
    private readonly registry;
    private readonly fonts;
    private readonly loaded;
    constructor(registry: FontRegistry | null, fonts: readonly HeadlessFont[]);
    get all(): readonly LoadedFont[];
    load(config: FontConfig): Promise<FontFamilies>;
    private read;
}
