import type { Chord, Note } from '@stringsync/mdom';
import { type StemmableNote } from 'vexflow/core';
import type { TabStemPlacement } from './config.js';
import type { DurationTranslator } from './duration-translator.js';
import type { ScoreReader } from './score-reader.js';
export declare class TabVoiceTranslator {
    private readonly durations;
    private readonly reader;
    private readonly tabStemPlacement;
    constructor(durations: DurationTranslator, reader: ScoreReader, tabStemPlacement: TabStemPlacement);
    private isHeld;
    tickables(chords: Chord[], tuning: number[] | null, record?: (lead: Note, tickable: StemmableNote) => void): StemmableNote[];
    private tabChord;
    private tabGrace;
    private positions;
    private derivePosition;
    private midiOf;
    private addTabModifiers;
    private tabAnnotation;
    private bendLabel;
    private styleFrets;
    private styleHarmonicFret;
    private harmonicBracket;
    private boldFret;
}
