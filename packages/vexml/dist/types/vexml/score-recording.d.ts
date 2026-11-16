import type { Rect } from '../core/geometry/index.js';
import type { ElementModel } from './element-model.js';
import type { Fold } from './fold.js';
import type { Note } from './note.js';
import type { PaintProbe } from './paint-probe.js';
import type { GapInfo } from './score.js';
import type { Engraving } from './score-drawer.js';
import { type ScoreSnapshot } from './score-snapshot.js';
import type { Sequence } from './sequence.js';
import type { SnapshotConfig } from './snapshot-config.js';
import type { SnapshotSource } from './snapshot-source.js';
export interface ScoreRecordingParts {
    config: SnapshotConfig;
    engraving: Engraving | null;
    fold: Fold | null;
    pages: readonly Rect[];
    elements: ElementModel;
    notes: readonly Note[];
    sequence: Sequence;
    gaps: readonly GapInfo[];
}
export declare class ScoreRecording implements SnapshotSource {
    private readonly parts;
    private readonly probe;
    readonly hasDocument = true;
    constructor(parts: ScoreRecordingParts, probe: PaintProbe);
    snapshot(): ScoreSnapshot;
}
