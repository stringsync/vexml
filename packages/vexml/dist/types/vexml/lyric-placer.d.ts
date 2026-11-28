import { Rect } from '../core/geometry/index.js';
import type { RenderContext, Stave, StaveNote } from 'vexflow/core';
import type { CollisionResolver } from './collision-resolver.js';
import { type LyricMark } from './lyric-mark.js';
import type { VoiceTranslator } from './voice-translator.js';
export interface LyricPlacerOptions {
    /** The color lyrics, hyphens and melisma lines are drawn in. */
    notationColor: string;
    lyricDrops?: Map<string, number>;
    documentPositions?: 'follow' | 'strict';
    /** The melisma line's width (`<line-width type="extend">`); 1px when absent. */
    extendWidth?: number | null;
    /** The most room between a word's hyphens (`<distance type="hyphen">`): a wider gap to
     * the next syllable gets more. Absent means one hyphen whatever the gap. */
    hyphenDistance?: number | null;
}
export interface PinnedSyllable {
    readonly stave: Stave;
    readonly system: number;
    readonly row: number;
    readonly left: number;
    readonly width: number;
    readonly rect: Rect;
    readonly verseIndex: number;
    readonly textSize: number;
    readonly lyric: LyricMark;
    melismaEndX?: number;
}
type PinOptions = {
    /** The system the row sits in; the first when absent. */
    system?: number;
};
export declare class LyricPlacer {
    private readonly translator;
    private readonly context;
    private readonly collisionResolver;
    private readonly lyricDrops;
    private readonly extendWidth;
    private readonly notationColor;
    private readonly hyphenDistance;
    private readonly documentPositions;
    private observedLyricDrops;
    private readonly steppedSystems;
    private readonly pinned;
    private readonly rests;
    constructor(translator: VoiceTranslator, context: RenderContext, collisionResolver: CollisionResolver, opts: LyricPlacerOptions);
    /** Key for one stave row of one system, the scope a verse's baseline is shared over. */
    private rowKey;
    recordDrop(system: number, row: number, drop: number): void;
    requestDrop(system: number, row: number, drop: number): void;
    carriedDrop(system: number, row: number): number;
    pin(notes: StaveNote[], row: number, baseline: number, opts?: PinOptions): void;
    private recordRests;
    /** Resolve a verse baseline, then apply only this syllable's relative-y. */
    baselineOf(lyric: LyricMark, stave: Stave, row: number, system: number, baseline: number): number;
    pinnedSyllables(): ReadonlyArray<PinnedSyllable>;
    rowDrop(system: number, row: number): number;
    private drawMelismas;
    drawSystemHyphens(system: number): void;
    private lyricsOf;
    observedDrops(): Map<string, number>;
    stepped(system: number): boolean;
    observedDropsOf(system: number): Map<string, number>;
    mark(): number;
    rewind(mark: number): void;
    forgetSystem(system: number): void;
}
export {};
