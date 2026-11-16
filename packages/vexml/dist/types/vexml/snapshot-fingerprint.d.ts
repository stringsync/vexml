import type { ScoreSnapshot } from './score-snapshot.js';
export declare class SnapshotFingerprint {
    private readonly bits;
    private readonly words;
    private a;
    private b;
    static of(snapshot: ScoreSnapshot): string;
    private stream;
    private item;
    private text;
    private mix;
    private digest;
}
