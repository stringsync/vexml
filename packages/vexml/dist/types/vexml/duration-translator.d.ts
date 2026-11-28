import type { Note } from '@stringsync/mdom';
import { GhostNote } from 'vexflow/core';
import type { ScoreReader } from './score-reader.js';
export declare class DurationTranslator {
    private readonly reader;
    constructor(reader: ScoreReader);
    /**
     * A note's vexflow duration code. <type> is optional in MusicXML (Finale omits it on the
     * rests it inserts to hold a voice open, and on a `<rest measure="yes"/>`), so fall back to
     * the note's own <duration>. A rest lasting its whole meter is a whole-measure rest, drawn
     * as a whole rest in meters shorter than 4/2 or 8/4 and as a breve rest in 4/2, 8/4 and
     * larger meters (Behind Bars p. 160); otherwise the duration maps to the note value it
     * equals. An unrecognized type, or a duration matching no plain note value, falls back to
     * 'q'.
     */
    code(lead: Note): string;
    private fillsMeter;
    /**
     * Fill a timing gap (in quarter-note beats) with invisible GhostNotes: tickables
     * that reserve the gap's time but draw nothing, so a voice that starts late or has
     * an internal hole stays aligned with its sibling voices. Exact down to a 128th.
     */
    ghostNotes(beats: number): GhostNote[];
}
