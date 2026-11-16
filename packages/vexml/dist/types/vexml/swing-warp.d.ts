import type { Swing } from './score-reader.js';
/**
 * One measure's swung beat axis: at() maps a written beat in the measure to the beat it plays
 * at under the swing in force, and is the identity when nothing is swinging. The measure keeps
 * its length, and a pickup swings in step with the notated downbeat. Exempt notes (see
 * {@link Note.isSwingExempt}) should skip it and keep their written beats.
 */
export declare class SwingWarp {
    private readonly swing;
    private readonly span;
    private readonly onBeatSpan;
    private readonly phase;
    private readonly origin;
    constructor(swing: Swing | null, opts: SwingWarpOptions);
    /** Where `beat` lands on this measure's swung axis. */
    at(beat: number): number;
    private warp;
}
export interface SwingWarpOptions {
    /** The measure's played length in quarter-note beats: a pickup is short. */
    playedBeats: number;
    /** What the meter says a full measure of it holds. */
    meterBeats: number;
}
