import type { Measure, Note } from '@stringsync/mdom';
import { type Stave, StaveNote, type TabNote, type TabStave } from 'vexflow/core';
import type { MidBarline, ScoreReader, StaffVoice } from './score-reader.js';
import type { MidClefSpec } from './signature-translator.js';
import type { SpannerBuilder } from './spanner-builder.js';
import type { PendingStave } from './system-formatter.js';
import type { TabVoiceTranslator } from './tab-voice-translator.js';
import type { VoiceTranslator } from './voice-translator.js';
export interface BuildNotesOptions {
    /** Pad the voices with ghost notes out to this beat, so an underfull measure still
     * reserves the trailing space the meter asks for. */
    meterFloor?: number;
    /** Bar-wide unbracketed <time-modification> ratio for polymetric measures (Behind Bars
     * pp. 174–175), applied to notes that did not join a drawn Tuplet. */
    polymetreRatio?: {
        actual: number;
        normal: number;
    } | null;
    /** How far the stave's clef draws its notes from their sounding pitch (a treble-8
     * clef's octave down), before any <octave-shift> on top. */
    clefOctaveShift?: number;
    /** Mid-measure dividers (see ScoreReader.midBarlinesOf), drawn on the first voice. */
    barlines?: MidBarline[];
    /** Mid-measure clef changes (see ScoreReader.midClefsOf), which re-aim every later note. */
    midClefs?: MidClefSpec[];
    /** This measure opens a new system (system > 0), so a tied-into note at beat 0 repeats
     * its accidental (Behind Bars p. 80). */
    opensSystem?: boolean;
    /** The new system's opening key signature alterations by step. */
    keyAlters?: ReadonlyMap<string, number>;
}
export interface VoiceBuilderOptions {
    /** The formatter's proportional-spacing exponent, shared with the layout's width
     * planning so measures format at the width they were planned for. */
    softmaxFactor: number;
    /** The per-note octave offset the score's <octave-shift> spans imply: every note
     * under one draws an octave (or two, or three) off its sounding pitch. Fixed for
     * the score. */
    octaveShiftByNote: ReadonlyMap<Note, number>;
    /** The pass-wide lead-note registry (see DrawPass.byLead), filled here as each
     * chord's StaveNote is built. */
    byLead: Map<Note, StaveNote>;
    /** The tablature counterpart of byLead, filled the same way with struck TabNotes. */
    byTabLead: Map<Note, TabNote>;
}
export declare class VoiceBuilder {
    private readonly translator;
    private readonly tab;
    private readonly reader;
    private readonly spanners;
    private readonly softmaxFactor;
    private readonly octaveShiftByNote;
    private readonly byLead;
    private readonly byTabLead;
    private readonly crossStave;
    private readonly standIns;
    private plannedStems;
    constructor(translator: VoiceTranslator, tab: TabVoiceTranslator, reader: ScoreReader, spanners: SpannerBuilder, opts: VoiceBuilderOptions);
    /** Notes in a two-stave beam group whose stems cross the gap, kept out of the stave
     * spill that sizes the gap between the staves, and their stems out of its obstacles. Filled by buildPartBeams;
     * the reference is stable. */
    crossStaveNotes(): ReadonlySet<StaveNote>;
    planStems(measure: Measure, staffNumbers: readonly string[]): void;
    private autoBeams;
    buildNotes(stave: Stave, row: number, voices: StaffVoice[], clef: string, opts: BuildNotesOptions): PendingStave;
    buildPartBeams(pending: readonly PendingStave[]): void;
    buildTabNotes(stave: TabStave, row: number, voices: StaffVoice[], tuning: number[] | null): PendingStave;
}
export declare function crossStaffStems(reader: ScoreReader, measure: Measure, staffNumbers: readonly string[]): Map<Note, 'up' | 'down'>;
export declare function voiceStem(index: number, count: number): 'up' | 'down' | undefined;
export declare function voiceStems(voices: readonly StaffVoice[], clef: string): ('up' | 'down' | undefined)[];
