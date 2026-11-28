import type { Clef, Key, Time } from '@stringsync/mdom';
import { type Clef as ClefGlyph } from 'vexflow/core';
import { Appearance } from './appearance.js';
import type { CustomKeyAccidental } from './custom-key-signature.js';
import type { ExtendedTimeSpec } from './extended-time-signature.js';
export declare class SignatureTranslator {
    private appearance;
    useAppearance(appearance: Appearance): void;
    vexflowKeySpec(key: Key): string;
    timeSignatureSpec(time: Time | null): string | null;
    extendedTimeSpec(time: Time | null): ExtendedTimeSpec | null;
    private timeSeparator;
    keyCancel(key: Key | null, prevKey: Key | null, cautionary?: boolean): KeyCancel | null;
    private timeFace;
    customKeyAccidentals(key: Key, clef: string): CustomKeyAccidental[];
    keyAlters(key: Key | null): ReadonlyMap<string, number>;
    vexflowClef(sign: string, line: number | null): string;
    clefName(clef: Clef): string;
    clefSize(clef: Clef | null, change: boolean): ClefSize;
    vexflowClefSpec(clef: Clef | null): string | null;
    midClefSpecs(changes: readonly {
        beat: number;
        clef: Clef;
    }[]): MidClefSpec[];
    clefGlyph(name: string, annotation: string | undefined): string | null;
    vexflowClefAnnotation(octaveChange: number | null): string | undefined;
    private keySignatureLine;
}
/** The key a key change cancels, as a vexflow key spec, and where its naturals print. */
export type KeyCancel = {
    spec: string;
    location: 'left' | 'right' | 'before-barline';
};
/** How a clef glyph is sized: vexflow's size name, then a scale on top of it. */
export type ClefSize = {
    size: 'default' | 'small';
    scale: number;
};
export declare function setClefGlyph(clef: ClefGlyph, glyph: string | null): void;
export declare function scaleClefGlyph(glyph: ClefGlyph, scale: number): void;
/** One mid-measure `<clef>` change, resolved to what vexflow draws and positions notes
 * against. See ScoreReader.midClefsOf. */
export type MidClefSpec = {
    beat: number;
    clef: string;
    annotation: string | undefined;
    size: ClefSize;
    /** The document's glyph for it, or null for vexflow's own (see clefGlyph). */
    glyph: string | null;
};
