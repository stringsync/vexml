import { Annotation, type RenderContext } from 'vexflow/core';
import type { LyricJustify, LyricMark } from './lyric-mark.js';
import type { DocumentPosition } from './score-reader.js';
export type LyricAnnotationOptions = {
    /** A CSS font-family list to type the syllable in. Absent means vexflow's text face. */
    family?: string;
    /** Which edge of the note the syllable lines up with (`<lyric justify>`). */
    justify?: LyricJustify;
    /** Ratio of the syllable's font-size to the score's lyric-font. */
    scale?: number;
    /** Whether a hyphen follows this syllable ('begin'/'middle'). */
    hyphenated?: boolean;
    /** Whether this syllable continues a divided word ('middle'/'end'). */
    continues?: boolean;
    documentPosition?: DocumentPosition | null;
};
export declare class LyricAnnotation extends Annotation implements LyricMark {
    /** 0-based verse index: which row under the stave this syllable sits on. Not readonly:
     * a stave carrying several voices offsets each voice's rows past the ones the voices
     * before it used (see {@link shiftVerses}). */
    verseIndex: number;
    /** Whether a melisma `<extend/>` line trails this syllable (drawn by LyricPlacer). */
    readonly extend: boolean;
    readonly kind: 'lyric';
    readonly textSize: number;
    readonly justify: LyricJustify;
    readonly hyphenated: boolean;
    readonly continues: boolean;
    readonly documentPosition: DocumentPosition | null;
    private baselineY;
    private positionX;
    constructor(text: string, 
    /** 0-based verse index: which row under the stave this syllable sits on. Not readonly:
     * a stave carrying several voices offsets each voice's rows past the ones the voices
     * before it used (see {@link shiftVerses}). */
    verseIndex: number, 
    /** Whether a melisma `<extend/>` line trails this syllable (drawn by LyricPlacer). */
    extend: boolean, opts?: LyricAnnotationOptions);
    setPositionX(x: number): void;
    setBaselineY(y: number): void;
    /** Push this syllable `rows` rows further from the stave. Voices sharing a stave each
     * number their verses from 1, so without an offset per voice every voice's first verse
     * would land on the same row and overprint. */
    shiftVerses(rows: number): void;
    getWidth(): number;
    boxLeft(noteheadBeginX: number, noteheadEndX: number): number;
    drawHyphen(ctx: RenderContext, x: number): void;
    draw(): void;
}
