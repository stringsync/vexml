import type { Part } from '@stringsync/mdom';
import type { MeasureNumbering } from './config.js';
import type { ScoreReader } from './score-reader.js';
import type { StavePlan } from './stave-plan.js';
export type MeasureNumberPlanOptions = {
    mode: MeasureNumbering;
};
export declare class MeasureNumberPlan {
    private readonly staves;
    private readonly parts;
    private readonly marks;
    private readonly followsDocument;
    private readonly mode;
    constructor(reader: ScoreReader, staves: StavePlan, parts: Part[], opts: MeasureNumberPlanOptions);
    /** Whether the stave for `staffNumber` of `parts[partIndex]` prints measure `m`'s number. */
    numbers(partIndex: number, staffNumber: string, m: number, isSystemStart: boolean): boolean;
    /** The configured cadence; 'document' with nothing in the document numbers each system. */
    private onCadence;
    /** A document mark's cadence. An implicit measure (a pickup) never shows its number. */
    private shows;
    private targets;
    private ownStave;
    private topStave;
    private bottomStave;
    /** The staves the part draws in measure `m`: none when it has no such measure. */
    private visibleOf;
}
