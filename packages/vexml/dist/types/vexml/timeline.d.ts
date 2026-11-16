import type { GapInfo } from './score.js';
import type { TempoMap } from './tempo-map.js';
/** One pass through a measure in playback order (see {@link Timeline.getBars}). */
export interface TimelineBar {
    readonly measureIndex: number;
    readonly startMs: number;
    readonly endMs: number;
}
/** A pitched note a step strikes or holds: its vexflow key ("E/4") and its MusicXML part id. */
export interface TimelineNote {
    readonly pitch: string;
    readonly partId: string;
}
/** One stretch of playback with the same notes sounding (see {@link Timeline.getSteps}). */
export interface TimelineStep {
    readonly startMs: number;
    readonly endMs: number;
    /** Notes attacked at its start, in no particular order, as `Sequence.classify(previous step, this step).started`. */
    readonly started: readonly TimelineNote[];
    /** Notes still ringing from the step before, or tied in from one that was. */
    readonly sustained: readonly TimelineNote[];
}
/**
 * A score's playback timing without its engraving (see `readTimeline`): the same duration,
 * beat-to-ms mapping, bar times and gaps the rendered Score reports for the same document and
 * gaps, built without laying the score out or drawing it.
 */
export declare class Timeline {
    private readonly tempo;
    private readonly durationBeats;
    private readonly bars;
    private readonly gaps;
    private readonly steps;
    constructor(tempo: TempoMap, durationBeats: number, bars: readonly TimelineBar[], gaps: readonly GapInfo[], steps: readonly TimelineStep[]);
    /** The whole playback in ms, repeats unrolled (Score.getDurationMs). */
    getDurationMs(): number;
    /** The whole playback in quarter-note beats, repeats unrolled. */
    getDurationBeats(): number;
    /** Quarter-note beats from the start to ms, through the score's tempo marks and gaps
     * (Sequence.beatsToMs). */
    beatsToMs(beats: number): number;
    /** Every measure pass in playback order, repeats and voltas unrolled: a measure that
     * plays twice, even back to back, has two entries. */
    getBars(): readonly TimelineBar[];
    /** Each configured gap's timing, in config order (Score.getGaps). */
    getGaps(): readonly GapInfo[];
    /** Every step in playback order, repeats unrolled, with the pitched notes it starts and
     * sustains (Sequence.getSteps with Sequence.classify). */
    getSteps(): readonly TimelineStep[];
}
