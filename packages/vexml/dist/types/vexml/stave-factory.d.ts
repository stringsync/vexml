import type { Clef, Measure, Part } from '@stringsync/mdom';
import { type Stave } from 'vexflow/core';
import type { ScoreReader } from './score-reader.js';
import { type KeyCancel, type SignatureTranslator } from './signature-translator.js';
import type { StavePlan } from './stave-plan.js';
export interface PlacedStave {
    stave: Stave;
    /** Whether the stave is a TabStave (fret numbers; no clef, key or time). */
    isTab: boolean;
    /** How many strings a tab stave has; 0 for a notation stave. */
    tabLines: number;
}
export declare class StaveFactory {
    private readonly signatures;
    private readonly staves;
    private readonly reader;
    constructor(signatures: SignatureTranslator, staves: StavePlan, reader: ScoreReader);
    create(part: Part, measure: Measure, staffNumber: string, x: number, y: number, width: number): PlacedStave;
    private lineDetails;
    private dashOf;
    addOpening(placed: PlacedStave, measure: Measure, staffNumber: string, cancel?: KeyCancel): void;
    addClefChange(stave: Stave, measure: Measure, staffNumber: string): void;
    addEndCancel(stave: Stave, cancel: KeyCancel, clef: Clef | null): void;
    addKey(stave: Stave, measure: Measure, staffNumber: string, cancel?: KeyCancel): void;
    customKey(measure: Measure, staffNumber: string): ReturnType<SignatureTranslator['customKeyAccidentals']>;
    clefSpec(measure: Measure, staffNumber: string): string | null;
    private clefName;
    private dressClef;
    private resizeTabClef;
}
