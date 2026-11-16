import type { RenderContext, Stave } from 'vexflow/core';
import { TimeSignature } from 'vexflow/core';
/** One stacked meter: a numerator over either digits or a (dotted) note glyph. */
export type TimeFace = {
    beats: string;
    beatType: string;
    /** What stands in for the denominator digits; null prints the digits. */
    note: 'note' | 'dotted-note' | null;
};
/** The second meter of an `<interchangeable>` and how it joins the first. */
export type TimeInterchange = {
    relation: string | null;
    face: TimeFace;
};
/** A `<time separator>` other than the default "none": how a face's two numbers are set. */
export type TimeSeparator = 'horizontal' | 'diagonal' | 'vertical' | 'adjacent';
export type ExtendedTimeSpec = {
    /** How each digit face sets its numbers; null stacks them, as vexflow does. */
    separator: TimeSeparator | null;
    /** One face per beats/beat-type pair, joined by a plus sign. */
    faces: TimeFace[];
    interchange: TimeInterchange | null;
};
export declare class ExtendedTimeSignature extends TimeSignature {
    private readonly spec;
    private readonly pieces;
    private readonly rules;
    private readonly lineOffset;
    constructor(spec: ExtendedTimeSpec);
    setTimeSig(timeSpec: string): this;
    drawAt(ctx: RenderContext, stave: Stave, x: number): void;
    private lineOf;
    private joiner;
    private add;
    private column;
    private separated;
    private textOf;
    private noteOf;
}
