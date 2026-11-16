import type { Jump } from './sequence.js';
/**
 * Iterates measure indices in playback order, expanding repeats and voltas: iterate it to get the
 * order a player would visit the measures in, with repeated stretches appearing as often as they
 * are played.
 *
 * A D.C. or D.S. is taken once, at the end of its measure: playback returns to the start or the
 * segno and plays straight through (no repeat back-jumps; a volta plays its last ending), a
 * `tocoda` then skips to the coda and a `fine` stops. Neither applies before the jump.
 */
export declare class MeasureSequenceIterator implements Iterable<number> {
    private readonly measures;
    constructor(measures: ReadonlyArray<{
        index: number;
        jumps: Jump[];
    }>);
    [Symbol.iterator](): Iterator<number>;
    private analyzeStructure;
    private walk;
    private navigate;
    private landmark;
    private resetNestedState;
    private findJump;
}
