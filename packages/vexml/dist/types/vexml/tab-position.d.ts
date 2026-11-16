import type { Note as MNote } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import type { Decorations } from './decoration.js';
import { Element, type Highlightable } from './element.js';
import type { NoteGlyph } from './geometry-collector.js';
import type { Note } from './note.js';
import { Toggle } from './toggle.js';
import type { Viewport } from './viewport.js';
export interface TabPositionOptions {
    string: number;
    fret: number;
    note: Note;
    decorations: Decorations;
    glyph: NoteGlyph | null;
}
export declare class TabPosition extends Element implements Highlightable {
    private readonly opts;
    readonly type = "tab-position";
    readonly color: Toggle;
    readonly halo: Toggle;
    private glyph;
    constructor(rect: Rect, viewport: Viewport, opts: TabPositionOptions);
    drawn(raw: {
        rect: Rect;
        glyph: NoteGlyph | null;
    }): void;
    getSources(): readonly MNote[];
    drawColor(ctx: CanvasRenderingContext2D, color: string): void;
    getString(): number;
    getFret(): number;
    getNote(): Note;
}
