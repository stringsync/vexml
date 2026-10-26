import type { ProgressiveEngraving } from './progressive-engraving';
import type { ScoreSnapshot } from './score-snapshot';
import type { SnapshotSource } from './snapshot-source';

/* The snapshot source of a progressive render: the recording waits until a snapshot is asked
 * for, which draws whatever is left first (see ProgressiveEngraving.recording). */
export class ProgressiveRecording implements SnapshotSource {
	readonly hasDocument = true;

	constructor(private readonly engraving: ProgressiveEngraving) {}

	snapshot(): ScoreSnapshot {
		return this.engraving.recording().snapshot();
	}
}
