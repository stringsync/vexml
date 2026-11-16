import type { ConfigInput } from './config.js';
import { PaintedScore } from './painted-score.js';
import { type ScoreSnapshot } from './score-snapshot.js';
export declare class SnapshotPainter {
    private readonly config;
    constructor(config: ConfigInput);
    paint(snapshot: ScoreSnapshot, container: HTMLDivElement): PaintedScore;
    private check;
    private view;
}
