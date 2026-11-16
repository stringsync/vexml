import type { Part } from '@stringsync/mdom';
import { type RenderContext, type Stave } from 'vexflow/core';
import type { GroupTimeSignature } from './group-time-signature.js';
import type { PartGroup, ScoreReader } from './score-reader.js';
import type { StavePlan } from './stave-plan.js';
export interface ConnectorColumn {
    /** Left edge of the measure column. */
    measureX: number;
    systemIndex: number;
    isSystemStart: boolean;
    /** Whether this is the last measure DRAWN (it closes with the thin-thick end line). */
    isLastMeasure: boolean;
    /** The measure's right <bar-style>, or null when it declares none. */
    barStyle: string | null;
    /** Whether the measure closes with a backward repeat. */
    repeatEnd: boolean;
    /** Whether that repeat butts against the next measure's forward repeat on the same
     * line, printing as one back-to-back sign. */
    repeatBoth: boolean;
    /** Where the column's opening repeat sign sits once aligned across its staves, or null
     * when there is no such sign. */
    begRepeatX: number | null;
    /** The system's top and bottom staves at this column; undefined until a stave exists. */
    systemTop: Stave | undefined;
    systemBottom: Stave | undefined;
    /** This column's top/bottom stave per part index, so a <part-group> connector can span
     * from one part's top stave to another's bottom. Sparse: a part with no measure here
     * has no entry. */
    partStaves: ReadonlyArray<{
        top: Stave;
        bottom: Stave;
    } | undefined>;
    /** The column's large `<group-time>` signatures by span index. */
    groupTimes?: ReadonlyMap<number, GroupTimeSignature>;
}
export declare class ConnectorDrawer {
    private readonly context;
    readonly _reader: ScoreReader;
    private readonly staves;
    private readonly parts;
    private readonly partGroups;
    private readonly groupTimeSpans;
    private readonly barlineBreaks;
    private readonly totalStaves;
    private readonly labelIndent;
    private readonly partLabelIndent;
    private readonly laterLabelIndent;
    private readonly abbreviationIndent;
    private readonly labelFont;
    private readonly notationColor;
    private readonly textColor;
    constructor(context: RenderContext, _reader: ScoreReader, staves: StavePlan, opts: ConnectorDrawerOptions);
    drawConnectors(column: ConnectorColumn): void;
    private drawGroupTimes;
    drawSystemStart(column: ConnectorColumn): void;
    drawPartSymbol(part: Part, top: Stave, bottom: Stave, measureX: number): void;
    barlineRuns(column: ConnectorColumn): Array<{
        top: Stave;
        bottom: Stave;
    }>;
    drawCustomBarline(stave: Stave, column: ConnectorColumn): void;
    paintBarStyle(stave: Stave, x: number, barStyle: string): void;
    connectorExtent(column: ConnectorColumn): {
        left: number;
        top: number;
        bottom: number;
    } | null;
    private drawPartGroupConnectors;
    private drawPartGroupNames;
    private drawRepeatConnector;
}
export interface ConnectorDrawerOptions {
    /** The score's parts, in render order. */
    parts: Part[];
    /** The <part-group> spans from the <part-list>, outermost first. Fixed for the score. */
    partGroups: PartGroup[];
    /** The part runs whose time signature draws once across them (`<group-time/>`). */
    groupTimeSpans?: ReadonlyArray<{
        fromPart: number;
        toPart: number;
    }>;
    /** Part boundaries a barline must not run across (<group-barline>no</group-barline>).
     * Empty for every score that doesn't ask, which is nearly all of them. */
    barlineBreaks: ReadonlySet<number>;
    /** Which kinds of stave the render shows, forwarded to every reader query so the
     * connectors agree with the stave rows actually drawn. */
    totalStaves: number;
    /** The first system's reserved left indents (see ScoreLayout): the whole label column,
     * and the inner band the part labels print in; group names go outside that. */
    labelIndent: number;
    partLabelIndent: number;
    /** The same two columns on systems after the first, holding the abbreviations. */
    laterLabelIndent: number;
    abbreviationIndent: number;
    labelFont: string;
    notationColor: string;
    textColor: string;
}
