import type { Harmony } from '@stringsync/mdom';
import type { Rect } from '../core/geometry/index.js';
import type { ChordFrame } from './chord-diagram-glyph.js';
import type { Decorations } from './decoration.js';
import { Element, type Highlightable } from './element.js';
import { Toggle } from './toggle.js';
import type { Viewport } from './viewport.js';
export interface ChordDiagramOptions {
    source: Harmony | null;
    frame: ChordFrame;
    title: string | null;
    decorations: Decorations;
}
export declare class ChordDiagram extends Element implements Highlightable {
    private readonly opts;
    readonly type = "chord-diagram";
    readonly color: Toggle;
    readonly halo: Toggle;
    constructor(rect: Rect, viewport: Viewport, opts: ChordDiagramOptions);
    getSources(): readonly Harmony[];
    getTitle(): string | null;
    getFrame(): ChordFrame;
}
