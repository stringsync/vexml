import { type Chord } from '@stringsync/mdom';
import { type StaveNote } from 'vexflow/core';
import type { ScoreReader } from './score-reader.js';
export declare class NotationTranslator {
    private readonly reader;
    private readonly opts;
    private readonly lyricFonts;
    constructor(reader: ScoreReader, opts?: NotationTranslatorOptions);
    attach(staveNote: StaveNote, chord: Chord): void;
    attachRest(staveNote: StaveNote, chord: Chord): void;
    private hidesNotations;
    private addArticulations;
    private addTextMark;
    private addOtherNotations;
    private addOrnaments;
    private fingeringLabel;
    private addTechnicals;
    private addFermata;
    private addArpeggio;
    private addNonArpeggiate;
    private addLyrics;
    private justifyOf;
    private lyricFaceOf;
    private lyricFontsOf;
    private soundOf;
    private syllableOf;
}
export interface NotationTranslatorOptions {
    /** Type lyrics in the faces their document names (Config.documentFonts), over `textFont`,
     * the configured text stack. Absent means vexml's own face. */
    documentFonts?: {
        textFont: string;
    };
}
