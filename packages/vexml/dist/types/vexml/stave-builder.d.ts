import type { Measure, Part } from '@stringsync/mdom';
import { Rect } from '../core/geometry/index.js';
import { type RenderContext, type Stave } from 'vexflow/core';
import type { Appearance } from './appearance.js';
import { type BarlineDecoration } from './barline-translator.js';
import type { CollisionResolver } from './collision-resolver.js';
import type { MeasureNumbering } from './config.js';
import type { Gaps } from './gaps.js';
import { GroupTimeSignature } from './group-time-signature.js';
import type { MeasureStyleMark, PartGroup, ScoreReader } from './score-reader.js';
import type { SignatureTranslator } from './signature-translator.js';
import type { SpillTracker } from './spill-tracker.js';
import type { StavePlan } from './stave-plan.js';
export interface StaveColumn {
    /** 0-based document index of the column's measure. */
    measureIndex: number;
    /** Left edge of the measure column. */
    measureX: number;
    measureWidth: number;
    systemIndex: number;
    /** Top y of the system's stave block; the stave-row offsets measure down from it. */
    systemY: number;
    /** Which stave row (counted over the whole system) this stave lands on. */
    staveRow: number;
    isSystemStart: boolean;
    /** Whether the preceding measure was drawn on this same system (not an edge gap). */
    prevOnSameSystem: boolean;
    /** Whether the preceding measure closed the system above (not an edge gap). */
    prevOnPreviousSystem: boolean;
    /** Whether the next measure opens the system below (not an edge gap). */
    nextOnNextSystem: boolean;
    /** Whether this is the score's first measure of music, which prints the time signature.
     * Not measure 0 when leading gaps sit before it. */
    opensScore: boolean;
    groupTimes: Map<number, GroupTimeSignature>;
    /** Whether this is the last measure DRAWN (it closes with the thin-thick end line). */
    isLastMeasure: boolean;
    /** The measure's right <bar-style>, or null when it declares none. */
    barStyle: string | null;
    /** The measure's repeat dots and volta bracket. */
    decoration: BarlineDecoration;
    /** Whether the measure's backward repeat butts against the next measure's forward
     * repeat on the same line, printing as one back-to-back sign. */
    repeatBoth: boolean;
    /** Whether the previous measure's backward repeat already closed this boundary, so
     * this measure skips its own opening dots. */
    suppressBegRepeat: boolean;
    /** Whether the previous measure closed with a backward repeat barline. */
    prevRepeatEnd: boolean;
    nextVolta: {
        x: number;
        width: number;
    } | null;
}
export declare class StaveBuilder {
    private readonly parts;
    private readonly partGroups;
    private readonly groupTimeSpans;
    private readonly totalStaves;
    private readonly measureNumbers;
    private readonly textColor;
    private readonly staveOffsets;
    private readonly systemStaveOffsets;
    private readonly voltaLifts;
    private readonly appearance;
    private readonly signatures;
    private readonly reader;
    private readonly staves;
    private readonly context;
    private readonly collisionResolver;
    private readonly spill;
    private readonly gaps;
    private readonly multiRests;
    private readonly multiRestSymbols;
    private readonly factory;
    constructor(opts: StaveBuilderOptions);
    private endCancelOf;
    private cautionaryKeyOf;
    private cautionaryTimeOf;
    private clefChangeAt;
    build(part: Part, measure: Measure, staffNumber: string, visibleCount: number, column: StaveColumn): BuiltStave;
    drawMultiRest(stave: Stave, count: number, symbols: boolean): void;
    private addMeasureNumberObstacle;
}
export interface BuiltStave {
    stave: Stave;
    /** Whether the stave is a TabStave (fret numbers; no clef, key or time). */
    isTab: boolean;
    volta: {
        box: Rect;
        top: number;
    } | null;
    /** How many measures the stave's <multiple-rest> consolidates, or null when the
     * measure draws its own notes. */
    multiRestCount: number | null;
    /** Whether that multirest draws old-style rest symbols instead of the thick bar. */
    multiRestSymbols: boolean;
    /** The sign the stave's <measure-style> draws in place of its notes (a measure repeat,
     * beat repeats, beat slashes), or null when the measure draws its own notes. */
    measureStyle: MeasureStyleMark | null;
}
export interface StaveBuilderOptions {
    signatures: SignatureTranslator;
    reader: ScoreReader;
    staves: StavePlan;
    context: RenderContext;
    collisionResolver: CollisionResolver;
    spill: SpillTracker;
    /** The configured gap measures, by document measure index. */
    gaps: Gaps;
    /** The score's parts, in render order. */
    parts: Part[];
    /** The <part-group> spans from the <part-list>, outermost first. Fixed for the score. */
    partGroups: PartGroup[];
    /** The part runs whose time signature draws once across them (`<group-time/>`). */
    groupTimeSpans: ReadonlyArray<{
        fromPart: number;
        toPart: number;
    }>;
    totalStaves: number;
    /** When to print measure numbers above the staff. */
    measureNumbering: MeasureNumbering;
    textColor: string;
    /** Stave-row y offsets from the system top (see ScoreLayout.staveOffsets). */
    staveOffsets: number[];
    systemStaveOffsets: ReadonlyMap<number, number[]> | undefined;
    voltaLifts: ReadonlyMap<number, number>;
    /** The document's line widths (staff, leger, ending), or Appearance.NONE. */
    appearance: Appearance;
}
