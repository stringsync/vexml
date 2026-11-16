import type { ConfigInput } from './config.js';
import type { PaintedScore } from './painted-score.js';
import type { ScoreSnapshot } from './score-snapshot.js';
export type { ConfigInput } from './config.js';
export type { PaintedScore } from './painted-score.js';
export { type ScoreSnapshot, SNAPSHOT_VERSION, } from './score-snapshot.js';
export { SnapshotMismatchError, type SnapshotMismatchReason, } from './snapshot-mismatch-error.js';
/**
 * Draw a snapshot's engraving into a container, sized and scaled as `render` shows it, with no
 * Score behind it: a picture that a later `render(snapshot, container, config)` takes over
 * without a repaint, bringing up events, the cursor and playback. Pass the config you will
 * render with: its sizes, background, pixel ratio and font colors apply here too. A snapshot
 * from createSnapshot carries its text's outlines, so it paints before any font loads.
 *
 * Throws SnapshotMismatchError, before touching the container, for a snapshot of another
 * format version, so a page can fall back to rendering the score from its file.
 */
export declare function paint(snapshot: ScoreSnapshot, container: HTMLDivElement, config?: ConfigInput): PaintedScore;
