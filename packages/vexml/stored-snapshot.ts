import type { ScoreSnapshot } from './score-snapshot';
import type { SnapshotSource } from './snapshot-source';

/* The snapshot a score was rendered from, handed back as it came: snapshotting it again would
 * only re-encode the same data. */
export class StoredSnapshot implements SnapshotSource {
	readonly hasDocument = false;

	constructor(private readonly stored: ScoreSnapshot) {}

	snapshot(): ScoreSnapshot {
		return this.stored;
	}
}
