import type { ScoreSnapshot } from './score-snapshot.js';
import type { SnapshotSource } from './snapshot-source.js';
export declare class StoredSnapshot implements SnapshotSource {
    private readonly stored;
    readonly hasDocument = false;
    constructor(stored: ScoreSnapshot);
    snapshot(): ScoreSnapshot;
}
