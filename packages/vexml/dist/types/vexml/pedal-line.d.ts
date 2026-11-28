import { PedalMarking, type StaveNote } from 'vexflow/core';
/** How a pedal span prints, read off its <pedal> markers. */
export type PedalStyle = {
    /** A bracket line under the span. */
    line: boolean;
    /** The "Ped." and "*" signs, alone or opening the line. */
    sign: boolean;
    /** "P." and "S." in place of "Ped." and "Sost. Ped.". */
    abbreviated: boolean;
    /** The sostenuto pedal rather than the sustain pedal. */
    sostenuto: boolean;
    /** The span picks up an earlier one (a resume): no down sign or hook. */
    resumed: boolean;
    /** The span confirms a continuing pedal at the start of a new system: "(Ped.)". */
    confirmed?: boolean;
    /** The span is dropped rather than released (a discontinue): no release sign or hook. */
    discontinued: boolean;
    /** Explicit right edge (e.g. system-end barline) when the line runs open across a break. */
    endX?: number;
};
export declare class PedalLine extends PedalMarking {
    private readonly down;
    private readonly changes;
    private readonly up;
    private readonly pedal;
    constructor(down: StaveNote, changes: readonly StaveNote[], up: StaveNote, pedal: PedalStyle);
    draw(): void;
    private drawLine;
    private drawSigns;
    private drawDepressSign;
    private depressSign;
    private liftX;
}
