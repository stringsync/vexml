import type { ProgressiveEngraving } from './progressive-engraving.js';
import type { ScoreSnapshot } from './score-snapshot.js';
import type { SnapshotSource } from './snapshot-source.js';
export declare class ProgressiveRecording implements SnapshotSource {
    private readonly engraving;
    readonly hasDocument = true;
    constructor(engraving: ProgressiveEngraving);
    snapshot(): ScoreSnapshot;
}
