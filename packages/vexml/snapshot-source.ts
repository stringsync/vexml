import type { ScoreSnapshot } from './score-snapshot';

/* Where a Score's snapshot comes from: the recording of the render that built it, or the
 * snapshot it was rendered from. */
export interface SnapshotSource {
	/* Whether the score was built from a document (so editing it can work), rather than from a
	 * snapshot. */
	readonly hasDocument: boolean;
	snapshot(): ScoreSnapshot;
}
