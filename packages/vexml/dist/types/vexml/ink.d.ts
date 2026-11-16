export declare class Ink {
    readonly notation: string | null;
    readonly text: string | null;
    static readonly NOTATION = "vexml-ink:notation";
    static readonly TEXT = "vexml-ink:text";
    static readonly LEDGER = "vexml-ink:ledger";
    static readonly DEFAULT: Ink;
    /** @param notation the engraved glyphs, staves and stems, or null for black.
     * @param text the words vexml types, or null for black. */
    constructor(notation: string | null, text: string | null);
    static isRole(value: unknown): boolean;
    resolve(value: unknown): unknown;
    equals(other: Ink): boolean;
}
