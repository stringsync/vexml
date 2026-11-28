import type { Clef, Key, Measure, Part, Time } from '@stringsync/mdom';
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
    static staffSizing(measure: Measure, staffNumber: string): {
        staffType: string | undefined;
        size: number;
    };
    constructor(signatures: SignatureTranslator, staves: StavePlan, reader: ScoreReader);
    create(part: Part, measure: Measure, staffNumber: string, x: number, y: number, width: number): PlacedStave;
    private lineDetails;
    private dashOf;
    addOpening(placed: PlacedStave, measure: Measure, staffNumber: string, cancel?: KeyCancel): void;
    addClefChange(stave: Stave, measure: Measure, staffNumber: string): void;
    addEndClefChange(stave: Stave, measure: Measure, staffNumber: string): void;
    addEndCancel(stave: Stave, cancel: KeyCancel, clef: Clef | null): void;
    addEndKey(stave: Stave, key: Key, cancel: KeyCancel | null, clef: Clef | null): void;
    addEndTimeSignature(stave: Stave, time: Time, timeSpec: string): void;
    addKey(stave: Stave, measure: Measure, staffNumber: string, cancel?: KeyCancel): void;
    customKey(measure: Measure, staffNumber: string): ReturnType<SignatureTranslator['customKeyAccidentals']>;
    clefSpec(measure: Measure, staffNumber: string): string | null;
    private clefName;
    private dressClef;
    private resizeTabClef;
}
