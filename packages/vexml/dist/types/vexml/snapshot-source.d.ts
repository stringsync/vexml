import type { ScoreSnapshot } from './score-snapshot.js';
export interface SnapshotSource {
    readonly hasDocument: boolean;
    snapshot(): ScoreSnapshot;
}
