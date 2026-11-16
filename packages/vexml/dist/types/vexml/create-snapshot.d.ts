import type { MDocument } from '@stringsync/mdom';
import { type ConfigInput } from './config.js';
import { type FontRegistry, type HeadlessFont } from './headless-fonts.js';
import type { ScoreSnapshot } from './score-snapshot.js';
/** What createSnapshot measures text on: a canvas from a canvas library, such as
 * `createCanvas(1, 1)` from @napi-rs/canvas. Any size will do. */
export interface SnapshotCanvas {
    getContext(contextId: '2d'): unknown;
}
/** How createSnapshot engraves. */
export interface SnapshotOptions {
    /** The config the snapshot is rendered with later. As with `render`, everything that shapes
     * the engraving must match then; sizes, pixel ratio and colors are free to differ. */
    config?: ConfigInput;
    /** The fonts the config names, as bytes or files. vexml brings its own Bravura. A family the
     * canvas library cannot find measures in its fallback face. */
    fonts?: HeadlessFont[];
    /** Where to register `fonts` (and vexml's Bravura) so the canvas measures text in them, such
     * as @napi-rs/canvas's `GlobalFonts`. Leave it out when they are registered already. */
    fontRegistry?: FontRegistry;
}
/**
 * Snapshot a MusicXML score with no DOM, under Bun or Node: what `Score.snapshot()` returns for
 * the same input and config, so a server can draw it ahead of time and a page can `render` (or
 * `paint`) it. Text is measured on `canvas`, whose metrics can differ a little from a
 * browser's; rendering the snapshot never lays it out again, so it shows as engraved here.
 * Gaps are placed as `render` places them: `config.gaps` positions over text or a .mxl Blob,
 * or gap measures already in an MDocument.
 */
export declare function createSnapshot(input: string | Blob | MDocument, canvas: SnapshotCanvas, opts?: SnapshotOptions): Promise<ScoreSnapshot>;
