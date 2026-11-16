import { type Resource } from '../core/disposable/index.js';
import { type Eventful, type Events } from '../core/events/index.js';
import { CursorController } from './cursor-controller.js';
import type { Drawing } from './drawing.js';
import { EditingController, type EditingControllerOptions } from './editing-controller.js';
import type { EditingSession } from './editing-session.js';
import type { ElementIndex } from './element-index.js';
import type { ScoreEventMap } from './events.js';
import type { Host } from './host.js';
import type { Layer, LayerKind } from './layer.js';
import { type Loupe, type LoupeOptions } from './loupe.js';
import type { Marker } from './marker.js';
import type { Page } from './page.js';
import type { Part } from './part.js';
import { Playhead, type PlayheadOptions } from './playhead.js';
import type { ScoreSnapshot } from './score-snapshot.js';
import type { Scroller } from './scroller.js';
import type { Sequence } from './sequence.js';
import type { SnapshotSource } from './snapshot-source.js';
import type { System } from './system.js';
/** A rendered gap measure's sync metadata: see `Config.gaps` and `Score.getGaps`. */
export interface GapInfo {
    /** The document measure index the gap landed on (gaps shift the indexes of the
     * measures after them, but not the printed measure numbers). */
    measureIndex: number;
    label: string | null;
    /** When the gap plays, in absolute playback ms (first occurrence under repeats). */
    startMs: number;
    endMs: number;
}
export interface ScoreOptions {
    /** The pages of a paged layout, top to bottom; none when absent. */
    pages?: readonly Page[];
    /** Absent for a score a test built by hand, which has nothing to snapshot. */
    snapshots?: SnapshotSource | null;
    /** How far the engraving has come: whole when absent, unless the render is progressive. */
    drawing?: Drawing;
}
export declare class Score implements Eventful<ScoreEventMap> {
    private readonly host;
    private readonly elements;
    private readonly sequence;
    private readonly scroller;
    private readonly gaps;
    private readonly dispatcher;
    private readonly disposer;
    private readonly listening;
    readonly events: Events<ScoreEventMap>;
    private readonly bound;
    private lastResize;
    private hovered;
    private lastClient;
    private unlistenScroll;
    private readonly cursors;
    private readonly editors;
    private readonly pages;
    private readonly snapshots;
    private readonly drawing;
    constructor(host: Host, elements: ElementIndex, decorations: Resource, sequence: Sequence, scroller: Scroller & {
        cancel(): void;
        suspendForResize(): void;
    }, gaps: readonly GapInfo[], opts?: ScoreOptions);
    addLayer(kind: LayerKind, zIndex?: number): Layer;
    createMarker(zIndex?: number): Marker;
    createLoupe(opts?: LoupeOptions): Loupe;
    setMaxHeight(px: number | null): void;
    createCursor(): CursorController;
    /** Compose editing input, written/layout navigation, selection visuals and scrolling.
     * Throws for a score rendered from a snapshot: editing needs the document. */
    createEditingController(editor: EditingSession, opts?: EditingControllerOptions): EditingController;
    createPlayhead(opts?: PlayheadOptions): Playhead;
    /** A recording of this score that `render` turns back into the same Score, without parsing,
     * laying out or drawing it: plain data to cache as JSON. It holds the engraving, the elements
     * and the timeline, not the document, so a score rendered from it can't be edited and its
     * elements' getSources() are empty. A score rendered from a snapshot hands back that same
     * snapshot object. Encoding is paid here, on the first call and every call after. */
    snapshot(): ScoreSnapshot;
    /** Whether every system is drawn: true from the start unless the render is progressive
     * (see Config.progressive), then once the last slice lands. */
    isComplete(): boolean;
    /** Resolves once every system is drawn (at once for a score drawn whole). Await it before
     * reading geometry across the whole score. Never settles for a score disposed first. */
    whenComplete(): Promise<void>;
    getDurationMs(): number;
    getDurationBeats(): number;
    getMeasureCount(): number;
    getMeasureIndexAtMs(ms: number): number;
    getMeasureIndexAtBeats(beats: number): number;
    getSequence(): Sequence;
    getGaps(): readonly GapInfo[];
    getElements(): ElementIndex;
    getParts(): Part[];
    getSystems(): System[];
    getPages(): Page[];
    getTimeAt(point: {
        x: number;
        y: number;
    }): {
        ms: number;
        beat: number;
        stepMs: number;
        stepBeat: number;
        stepIndex: number;
    } | null;
    private stepRangeAt;
    dispose(): void;
    private unbindAll;
    private retain;
    private bind;
    private unbind;
    private listen;
    private sourceOf;
    private targetAt;
    private recomputeHover;
}
