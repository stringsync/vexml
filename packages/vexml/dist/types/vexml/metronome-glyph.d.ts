import { type RenderContext } from 'vexflow/core';
import type { DocumentPosition } from './score-reader.js';
export declare class MetronomeGlyph {
    /** Total advance width, how far the ink reaches above/below the baseline, and the center of `=`. */
    readonly width: number;
    readonly ascent: number;
    readonly descent: number;
    readonly equalsCenter: number;
    private readonly placed;
    private readonly bars;
    private readonly curves;
    private readonly arrows;
    private x;
    private top;
    private readonly noteAscent;
    private readonly beamThickness;
    private readonly stemWidth;
    private readonly glyph;
    private readonly text;
    constructor(modulation: TempoModulation);
    private putGlyph;
    private putText;
    private putGroup;
    private putArrow;
    private putTies;
    private putBeams;
    private putBrackets;
    /** Draw the group with its left edge at `x` and its noteheads centered on `baseline`. */
    draw(context: RenderContext, x: number, baseline: number): void;
    private drawArrow;
}
/** SMuFL metronome note glyph for a MusicXML beat-unit or VexFlow duration code. */
export declare function metronomeNoteGlyph(duration: string): string;
/** A `<metronome-tuplet>` marker: the ratio's `actual-notes`, and which end of the span this is. */
export type ModulationTuplet = {
    actual: number;
    type: 'start' | 'stop';
};
/** One `<metronome-note>` of a metric modulation. */
export type ModulationNote = {
    /** `<metronome-type>`: 'eighth', 'quarter', … */
    type: string;
    /** `<metronome-dot/>` count. */
    dots: number;
    /** Drawn beamed rather than flagged: the note carries at least one `<metronome-beam>`. */
    beamed: boolean;
    /** How many beams run from this note to the next: its 'begin'/'continue' markers. */
    beamsToNext: number;
    /** Tied to the note after it: a `<metronome-tied type="start">`, or a `<beat-unit-tied>`. */
    tiesToNext: boolean;
    tuplet: ModulationTuplet | null;
};
/**
 * A `<metronome>` written in the note form: two note groups either side of a
 * `<metronome-relation>`. This is the shape a swing marking takes, and the beat-unit form (see
 * `TempoMark`) cannot express it: a beat unit is one note, never a beamed pair or a triplet.
 */
export type TempoModulation = {
    left: ModulationNote[];
    right: ModulationNote[];
    /** Text for the right side instead of notes: the bpm, when a `<beat-unit>` mark is drawn here. */
    rate: string | null;
    parenthesis: boolean;
    /** `<metronome-arrows>`: an arrow either side of the mark. */
    arrows: boolean;
    /** `justify`: which part of the mark sits at its anchor. */
    justify: 'left' | 'center' | 'right' | null;
    /** The `<metronome>`'s document position (see ScoreReader.positionOf). */
    position?: DocumentPosition | null;
};
