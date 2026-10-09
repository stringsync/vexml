/*
 * @stringsync/vexml/paint: draw a snapshot before the app that renders it has loaded. Kept apart
 * from the main entry so a page can load it alone: it holds no parser, layout or vexflow, only
 * what replays a snapshot's engraving onto canvases.
 */
import type { ConfigInput } from './config';
import type { PaintedScore } from './painted-score';
import type { ScoreSnapshot } from './score-snapshot';
import { SnapshotPainter } from './snapshot-painter';

export type { ConfigInput } from './config';
export type { PaintedScore } from './painted-score';
export {
	type ScoreSnapshot,
	SNAPSHOT_VERSION,
} from './score-snapshot';
export {
	SnapshotMismatchError,
	type SnapshotMismatchReason,
} from './snapshot-mismatch-error';

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
export function paint(
	snapshot: ScoreSnapshot,
	container: HTMLDivElement,
	config: ConfigInput = {},
): PaintedScore {
	return new SnapshotPainter(config).paint(snapshot, container);
}
