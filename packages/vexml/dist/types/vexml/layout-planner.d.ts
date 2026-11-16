import type { Score } from '@stringsync/mdom';
import { Appearance } from './appearance.js';
import type { Config } from './config.js';
import type { PageSize } from './document-layout.js';
import type { Gaps } from './gaps.js';
import type { LayoutPlan } from './layout-plan.js';
import type { ScoreReader } from './score-reader.js';
import type { SignatureTranslator } from './signature-translator.js';
import type { StavePlan } from './stave-plan.js';
import type { TabVoiceTranslator } from './tab-voice-translator.js';
import type { VoiceTranslator } from './voice-translator.js';
export declare class LayoutPlanner {
    private readonly translator;
    private readonly tab;
    private readonly signatures;
    private readonly staves;
    private readonly reader;
    private readonly configuredGaps;
    constructor(translator: VoiceTranslator, tab: TabVoiceTranslator, signatures: SignatureTranslator, staves: StavePlan, reader: ScoreReader, configuredGaps: Gaps);
    private noteLogWidth;
    private graceWidthOf;
    private measureNoteArea;
    private estimateNoteArea;
    private tupletGroupCount;
    private minNoteWidth;
    private gapLabelWidth;
    private trailingWordsPad;
    private leadingWordsPad;
    private pageOf;
    private flowOf;
    private documentSystems;
    /** Lay the parts out at the reference width: where every measure box sits, how
     * staves stack within a system, and how tall/wide the page starts. Depends only on
     * the music and the options, never on the live container: the finished result is
     * scaled to fit its container. */
    plan(score: Score, config: Config): ScoreLayout;
    /**
     * Begin the layout `plan` makes, to place a system at a time (see LayoutPlan): the systems
     * the first screen of a progressive render needs before the rest of the score is measured.
     * The plan comes complete where it rests on the whole score: a panoramic line, an
     * `overflow: 'widen'` page, and a layout following the document's own.
     */
    begin(score: Score, config: Config): LayoutPlan;
}
/** What the document says sits above one system, in px (see LayoutPlanner.documentSystems). */
export type DocumentSystem = {
    /** From the bottom line of the system above to this one's top line; null when unset. */
    systemDistance: number | null;
    /** From the page's top margin to this system's top line, when it opens a page. */
    topSystemDistance: number | null;
    /** The top stave's top line, relative to the stave's y. */
    lineTop: number;
    /** Whether the document starts a page with this system (`<print new-page="yes">`). */
    startsPage: boolean;
    /** Blank pages the document leaves before the page this system starts. */
    blankPages: number;
    /** The page this system opens, where its `<print>` page-layout sets the page's own height or
     * vertical margins (paged layouts only); null otherwise. */
    page: PageSize | null;
    /** documentLayout 'strict': the system distance is kept even where the music runs into
     * the system above. */
    strict: boolean;
    /** Per stave row, whether the gap above it is the document's, kept as set ('strict'); the
     * music opens every other gap it would print through. */
    fixedGaps: boolean[];
};
/** A paged layout's page, in score px. */
export type PageFrame = {
    width: number;
    height: number;
    marginTop: number;
    marginBottom: number;
    /** How far right the drawing shifts to sit on the page. */
    offsetX: number;
    /** How far right an even page's systems sit from an odd page's, when the document gives
     * even pages margins of their own. */
    evenShift: number;
};
/** A measure's placed box within its system. */
export type MeasureBox = {
    x: number;
    width: number;
    /** Part of `width` held open before the right barline for a words directive on the
     * measure's last note (see LayoutPlanner.trailingWordsPad); the notes format into the
     * rest. 0 for measures with no such directive. */
    trailingPad: number;
    /** Part of `width` held open after the left barline for a CENTERED words directive on the
     * measure's first note (see LayoutPlanner.leadingWordsPad); the notes start after it.
     * 0 for measures with no such directive. */
    leadingPad: number;
    systemIndex: number;
    /** First / last measure of its system that is music: a leading or trailing gap is not. */
    isSystemStart: boolean;
    isSystemEnd: boolean;
    /** A gap before the score's first measure ('leading') or after its last ('trailing'):
     * drawn as a box outside the staves, `x`/`width` being exactly that box. Null for every
     * other measure, gaps between measures included. */
    edge: 'leading' | 'trailing' | null;
};
/** Where everything goes: parts laid out at a reference width, ready for the draw
 * pass. Pure geometry: no vexflow drawing happens here. */
export type ScoreLayout = {
    measureCount: number;
    totalStaves: number;
    boxes: MeasureBox[];
    /** Each stave's y-offset within a system, indexed by global stave row. The planned
     * spacing (from the fixed constants) and the floor no system goes below. */
    staveOffsets: number[];
    /** What each system actually needs once drawn, indexed by system (see
     * SpillResolver.spacedOffsets), which the draw fills in. Before it, the document's own stave
     * gaps when documentLayout follows the document, else empty: a system missing from it uses
     * the planned offsets. */
    systemStaveOffsets: Map<number, number[]>;
    /** The document's vertical layout per system, indexed by system; absent unless
     * documentLayout follows the document. */
    documentSystems?: DocumentSystem[];
    /** The document's engraving sizes when documentLayout follows the document, else
     * Appearance.NONE. */
    appearance: Appearance;
    /** The page a paged layout fits its systems onto; null for any other layout. */
    page: PageFrame | null;
    /** Top margin: the first system's y. */
    top: number;
    /** Vertical gap between stacked systems. */
    systemGap: number;
    /** Page width (reference width, or content width in panoramic). */
    width: number;
    /** Left space reserved on the first system for part labels AND any <part-group> names
     * printed outside them (0 when nothing is labelled). Where draw places the names. */
    labelIndent: number;
    /** The part-label column alone, out of `labelIndent`: names right-align against the
     * staves inside it, and a group name right-aligns against ITS left edge. 0 when no
     * <part-group> declares a <group-name>, in which case it equals labelIndent. */
    partLabelIndent: number;
    /** The same two columns on every system after the first, holding the abbreviations:
     * the whole indent, and the part-abbreviation column alone. 0 when nothing has one. */
    laterLabelIndent: number;
    abbreviationIndent: number;
    /** Starting page height, before the draw pass grows it for deep ledger lines. */
    floorHeight: number;
    /** Resolved spacing curve, shared by this measurement and the draw pass so the
     * drawn notes land where the spacing was computed for. */
    softmaxFactor: number;
};
/** The two widths a measure's note area can take. `ideal` is what the spacing curve wants;
 * `min` is the hard floor below which the notes no longer fit. Layout squeezes between them
 * and never past `min`, so no configuration can produce a system with cut-off notes. */
export type NoteAreaOptions = {
    floor: number;
    noteSpacing: number;
    softmaxFactor: number;
};
export type NoteArea = {
    min: number;
    ideal: number;
    fixed?: boolean;
};
