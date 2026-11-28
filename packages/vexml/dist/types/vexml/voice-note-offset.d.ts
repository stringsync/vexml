import { StaveNote, type Voice } from 'vexflow/core';
/** Notes on a stave that open (start) or close (stop) a tie. */
export type VoiceTieEnds = {
    starts: ReadonlySet<StaveNote>;
    stops: ReadonlySet<StaveNote>;
};
/** Reserve the offset during both width planning and final formatting. */
export declare function offsetAdjacentVoices(voices: Voice[], ties?: VoiceTieEnds): void;
