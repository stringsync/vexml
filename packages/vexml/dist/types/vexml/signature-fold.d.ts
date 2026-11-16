import type { Score } from '@stringsync/mdom';
import type { Fold } from './fold.js';
import type { MeasureBox } from './layout-planner.js';
import type { ScoreReader } from './score-reader.js';
import type { SignatureTranslator } from './signature-translator.js';
import type { StavePlan } from './stave-plan.js';
export interface SignatureFoldOptions {
    /** The laid-out measure boxes; the fold follows the first system (a panorama's only one). */
    boxes: ReadonlyArray<MeasureBox | undefined>;
    /** Each stave row's final score-space y, as the draw pass placed it. */
    rowYs: readonly number[];
    totalStaves: number;
    /** The engraving's final score-space height. */
    height: number;
    notationColor: string;
    textColor: string;
}
export declare class SignatureFold implements Fold {
    private readonly reader;
    private readonly staves;
    private readonly score;
    private readonly opts;
    readonly left: number;
    readonly width: number;
    readonly height: number;
    private readonly parts;
    private readonly states;
    private readonly factory;
    private readonly systemX;
    constructor(signatures: SignatureTranslator, reader: ScoreReader, staves: StavePlan, score: Score, opts: SignatureFoldOptions);
    get starts(): number[];
    indexAt(x: number): number;
    paint(context2D: CanvasRenderingContext2D, index: number): void;
    private signatureAt;
    private column;
}
