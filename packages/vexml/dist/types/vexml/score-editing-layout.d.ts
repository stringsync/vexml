import type { EditingLayout } from './editing-layout.js';
import type { Score } from './score.js';
export declare class ScoreEditingLayout implements EditingLayout {
    private readonly score;
    constructor(score: Score);
    getSystems(): (readonly import("@stringsync/mdom").Measure[])[];
}
