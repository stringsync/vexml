import type { Harmony, Barline as MBarline, Measure as MMeasure, Note as MNote, Part as MPart } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import type { Decoratable } from './decoration.js';
import type { NoteGlyph } from './geometry-collector.js';
import type { Toggle } from './toggle.js';
import type { Viewport } from './viewport.js';
/** The mdom nodes a vexml Element can be built from. */
export type MSource = MNote | MMeasure | MPart | Harmony | MBarline;
export interface Highlightable {
    readonly color: Toggle;
    readonly halo: Toggle;
}
export interface Playable {
    getPitch(): string | null;
    getDurationBeats(): number;
    getArticulations(): string[];
    isGrace(): boolean;
}
export declare function isHighlightable(el: Element): el is Element & Highlightable;
export declare function isPlayable(el: Element): el is Element & Playable;
export declare abstract class Element implements Decoratable {
    private box;
    protected readonly viewport: Viewport;
    abstract readonly type: string;
    constructor(box: Rect, viewport: Viewport);
    get rect(): Rect;
    relocate(rect: Rect): void;
    abstract getSources(): readonly MSource[];
    drawColor(ctx: CanvasRenderingContext2D, color: string): void;
    getBoundingClientRect(): DOMRect;
    protected stampGlyph(ctx: CanvasRenderingContext2D, glyph: NoteGlyph, color: string): void;
}
