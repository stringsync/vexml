import { CanvasContext } from 'vexflow/core';
import type { PaintContext } from './paint-context.js';
import type { PaintList } from './paint-list.js';
/** A CanvasContext over a recording {@link PaintContext} that keeps VexFlow's notation groups.
 * CanvasContext discards them; recorded on the list, diagnostic mask replays can separate
 * elements without changing paint. */
export declare class RecordingCanvasContext extends CanvasContext {
    private readonly list;
    constructor(paint: PaintContext, list: PaintList);
    openGroup(cls?: string): undefined;
    closeGroup(): void;
}
