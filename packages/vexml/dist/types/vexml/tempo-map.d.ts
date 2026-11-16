/** One stretch of the timeline played at a constant rate, in quarter-note beats. */
export type TempoSegment = {
    startBeat: number;
    endBeat: number;
    bpm: number;
};
/**
 * The score's tempo map: the contiguous, ordered rate segments playback runs on, and the two
 * conversions between beats and milliseconds they define.
 *
 * SequenceFactory builds one while it walks playback order and hands it to the Sequence, which
 * is why this is its own object rather than a pair of Sequence methods: the factory has to date
 * its own steps before there is a Sequence to ask.
 */
export declare class TempoMap {
    readonly segments: readonly TempoSegment[];
    constructor(segments: readonly TempoSegment[]);
    /**
     * Quarter-note beats -> milliseconds. Folds the elapsed time of every segment the beat spans,
     * plus the partial of the segment it lands in. A beat past the last segment extrapolates at
     * the last segment's rate.
     */
    msAt(beats: number): number;
    /** Milliseconds -> quarter-note beats: the monotonic inverse of {@link msAt}. */
    beatsAt(ms: number): number;
}
