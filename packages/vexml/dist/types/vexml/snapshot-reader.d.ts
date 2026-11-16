import { Rect } from '../core/geometry/index.js';
import type { Config } from './config.js';
import type { ElementModel } from './element-model.js';
import type { Fold } from './fold.js';
import type { Engraving } from './score-drawer.js';
import { type ScoreSnapshot } from './score-snapshot.js';
import type { SequenceModel } from './sequence.js';
export interface ReadSnapshot {
    engraving: Engraving | null;
    fold: Fold | null;
    pages: Rect[];
    elements: ElementModel;
    sequence: SequenceModel;
}
export declare class SnapshotReader {
    private readonly config;
    constructor(config: Config);
    static isSnapshot(input: unknown): input is ScoreSnapshot;
    check(snapshot: ScoreSnapshot): void;
    read(snapshot: ScoreSnapshot): ReadSnapshot;
}
