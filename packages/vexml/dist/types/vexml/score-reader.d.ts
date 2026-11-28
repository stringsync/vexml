import { type Barline, type BeamRun, Chord, type Clef, type Direction, type Harmony, type Key, MElement, type Measure, type Note, type Part, type Score, type Time } from '@stringsync/mdom';
import { Appearance } from './appearance.js';
import type { ChordFrame } from './chord-diagram-glyph.js';
import { DocumentLayout } from './document-layout.js';
import type { DynamicGlyphs } from './dynamic-glyphs.js';
import type { TempoModulation } from './metronome-glyph.js';
import type { Jump } from './sequence.js';
import { type EnclosureShape } from './text-enclosure.js';
export declare class ScoreReader {
    private readonly dynamics;
    private readonly measureBeats;
    private readonly lengths;
    private readonly noteLists;
    private readonly noteReads;
    private readonly midClefCache;
    private readonly staffVoiceCache;
    private readonly voiceCache;
    private readonly divisionsByMeasure;
    private readonly staffStyleCache;
    private readonly wordFonts;
    constructor(dynamics: DynamicGlyphs);
    measureBeatOf(note: Note): number | null;
    beatsOf(note: Note): number | null;
    notesOf(measure: Measure): Note[];
    private readNote;
    beamsOf(note: Note): Note['beams'];
    technicalsOf(note: Note): Note['technicals'];
    isPluckedStringPart(part: Part): boolean;
    private readonly pluckedStringParts;
    private detectPluckedStringPart;
    isLowerGrandStaff(note: Note): boolean;
    lyricsOf(note: Note): Note['lyrics'];
    ornamentsOf(note: Note): Note['ornaments'];
    accidentalMarksOf(note: Note): MElement[];
    dotsOf(note: Note): number;
    accidentalOf(note: Note): Note['accidental'];
    tiesOf(note: Note): Note['ties'];
    isChordMember(note: Note): boolean;
    beamRuns(notes: Note[]): BeamRun[];
    staffVoices(measure: Measure, staffNumber: string): StaffVoice[];
    voicesOf(measure: Measure): MeasureVoice[];
    private projectVoices;
    keyIdentity(key: Key | null): string | null;
    meterFloor(measure: Measure, staffNumber?: string): number;
    polymetreRatio(measure: Measure, staffNumber?: string): {
        actual: number;
        normal: number;
    } | null;
    meterBeats(time: Time | null): number;
    beatUnit(time: Time | null): number;
    midBarlinesOf(measure: Measure): MidBarline[];
    barlineAt(measure: Measure, location: 'left' | 'right'): Barline | null;
    barlineFermatasOf(measure: Measure): BarlineFermata[];
    midClefsOf(measure: Measure, staffNumber: string): {
        beat: number;
        clef: Clef;
    }[];
    multiRestsOf(parts: Part[]): {
        leads: Map<number, number>;
        hidden: Set<number>;
        symbols: Set<number>;
    };
    private multiRestUsesSymbols;
    measureStyleOf(measure: Measure, staffNumber: string): MeasureStyleMark | null;
    noteStyleOf(note: Note): NoteStyle;
    bendOf(note: Note): TabBendMark | null;
    isRhythmSlashed(note: Note): boolean;
    private staffStylesOf;
    clefAtEndOf(measure: Measure | undefined, staffNumber: string): Clef | null;
    /**
     * The `<print><measure-numbering>` that leads `measure`, or null when its <print> sets none.
     * It holds from here on in its part until the next one, which the caller carries forward.
     * `system` (which part of the system shows the number) and `staff` (which of the part's
     * staves the number rides) are null when absent.
     */
    measureNumberingOf(measure: Measure): MeasureNumberingMark | null;
    tempoOf(measure: Measure): TempoMark | null;
    modulationOf(measure: Measure): TempoModulation | null;
    rateModulationOf(measure: Measure): TempoModulation | null;
    private tiedUnitsOf;
    private unitNotesOf;
    private justifyOf;
    playbackTempoOf(measure: Measure): TempoMark | null;
    swingOf(measure: Measure): Swing | null;
    wordsOf(measure: Measure): {
        text: string;
        glyph: boolean;
        dynamicDirection?: Direction;
        tempoDirection?: Direction;
        staffNumber: string;
        lead: Note | null;
        placement: Placement;
        opensBar: boolean;
        closesBar: boolean;
        directive: boolean;
        tempo: boolean;
        explicitSize: boolean;
        format: TextFormat;
        position: DocumentPosition | null;
    }[];
    private offsetBeatsOf;
    private divisionsAt;
    private leadAtBeat;
    dynamicsOf(measure: Measure): {
        text: string;
        glyph: boolean;
        direction: Direction;
        staffNumber: string;
        lead: Note | null;
        placement: Placement;
        format: TextFormat;
        position: DocumentPosition | null;
    }[];
    symbolsOf(measure: Measure): {
        glyph: string;
        staffNumber: string;
        lead: Note | null;
        placement: Placement | null;
        isDamp: boolean;
        opensBar: boolean;
    }[];
    private directionSymbolOf;
    harpPedalsOf(measure: Measure): {
        glyphs: string;
        staffNumber: string;
        lead: Note | null;
        placement: Placement | null;
        position: DocumentPosition | null;
    }[];
    rehearsalsOf(measure: Measure): {
        text: string;
        format: TextFormat;
        position: DocumentPosition | null;
    }[];
    figuredBassesOf(measure: Measure): {
        lead: Note;
        figures: string[];
        position: DocumentPosition | null;
    }[];
    navigationsOf(measure: Measure): {
        kind: 'segno' | 'coda';
        position: DocumentPosition | null;
    }[];
    pictogramsOf(measure: Measure): {
        symbol: Pictogram;
        staffNumber: string;
        lead: Note | null;
        placement: Placement;
    }[];
    pedalsOf(measure: Measure): PedalMark[];
    private onStaffOf;
    private lastOnStaff;
    wedgesOf(measure: Measure): WedgeMark[];
    octaveShiftsOf(part: Part): OctaveShiftSpan[];
    directionLinesOf(part: Part): DirectionLineSpan[];
    harmoniesOf(measure: Measure): {
        lead: Note;
        text: string;
        symbol: HarmonySymbol;
        frame: ChordFrame | null;
        framePosition: DocumentPosition | null;
        placement: Placement;
        source: Harmony;
        position: DocumentPosition | null;
    }[];
    endBeatOf(voices: {
        chords: Chord[];
    }[]): number;
    barlineBreaks(score: Score): Set<number>;
    private groupStarts;
    groupTimeSpans(score: Score): Array<{
        fromPart: number;
        toPart: number;
    }>;
    partGroups(score: Score): PartGroup[];
    partLabels(part: Part): {
        name: string | null;
        abbreviation: string | null;
    };
    documentLayoutOf(score: Score): DocumentLayout;
    appearanceOf(score: Score): Appearance;
    private layoutBlockOf;
    private blankPagesOf;
    private pageMarginsOf;
    headerOf(score: Score): ScoreHeader | null;
    private creditHeader;
    private creditSide;
    private catalogHeader;
    private identificationRights;
    private labelOf;
    measureRepeats(measures: readonly Measure[]): MeasureRepeat[];
    measureJumps(measures: readonly Measure[]): Jump[][];
    private navigationJumps;
    /** How many passes an ending covers, from its `<ending number>` ("1", "1,2", "1-3"). */
    private endingPasses;
    /** The FIRST pass an ending covers ("1" -> 1, "2,3" -> 2, "3-4" -> 3). Playback compares
     * this across adjacent runs: a number that doesn't climb means the volta group restarted,
     * i.e. the new run belongs to an enclosing repeat block. Defaults to 1 for a malformed or
     * absent attribute, which reads as a restart and so errs toward splitting rather than
     * merging two unrelated groups. */
    private endingFirstPass;
    /**
     * One side of a metric modulation, as the drawing side wants it. Beams are counted rather
     * than tracked as a run: a 'begin'/'continue' marker means that beam level carries on to the
     * NEXT note, so counting them gives the beams to draw in the gap, while an 'end'/'backward
     * hook' marker only says this note is beamed at all.
     */
    private modulationNotesOf;
    /**
     * A `<direction>`'s placement attribute. MusicXML leaves it optional and the default is
     * renderer's choice, so each caller names the fallback it wants: 'above' keeps an unmarked
     * directive where it has always drawn, and the ones that engrave BELOW by convention
     * (dynamics, wedges) say so.
     */
    private placementOf;
    private pictogramElementOf;
    private pictogramOf;
    measureWidthOf(measure: Measure): number | null;
    positionOf(element: MElement, host?: {
        placement: Placement | null;
    } | null): DocumentPosition | null;
    private wordFontOf;
    private formatOf;
    private harmonyExtensionSigns;
    private harmonySymbol;
    private analysisSymbol;
    private numeralText;
    private numeralKeyText;
    private degreeBrackets;
    private degreeTexts;
    private harmonyAlter;
    private bassText;
    private frameOf;
    private multiRestCountOf;
    /** MusicXML `<group-symbol>` -> the connector vexml draws. null means "draw nothing". */
    private groupSymbol;
    private readBarlines;
    private wingedOf;
    private tenthsOf;
}
/**
 * A chord symbol laid out for drawing: `head` (root, kind, any opening bracket), a
 * column of degrees stacked bottom-up beside it, then `tail` (closing bracket, bass).
 * Inline degrees ride in `head`, leaving `stack` and `tail` empty. `text` is the whole
 * symbol on one line, as a fret-box title prints it. A Roman numeral's inversion figures
 * ride in `stack` too, with `hang` set: the column hangs from the numeral's top, so a lone
 * 7 reads as a superscript and a 6/5 straddles the baseline, where a chord symbol's
 * degrees stand on it.
 */
export type HarmonySymbol = {
    text: string;
    head: string;
    stack: string[];
    tail: string;
    hang: boolean;
};
/**
 * A metronome mark: the beat-unit's vexflow duration code plus its bpm. The optional
 * fields are the printed variants: augmentation dots on either unit, a second unit for
 * the note-equals-note metric modulation, and the parenthesized form. Only the drawing
 * path reads them; playback needs `bpm` alone.
 */
/** Where a part's measure numbers go, from its `<print><measure-numbering>`. */
export type MeasureNumberingMark = {
    /** 'none' numbers nothing, 'measure' every measure, 'system' each system's first. */
    value: 'none' | 'measure' | 'system';
    system: SystemRelation | null;
    staff: string | null;
};
/** MusicXML's system-relation-number: which part of the system shows the number. */
export type SystemRelation = (typeof SYSTEM_RELATIONS)[number];
declare const SYSTEM_RELATIONS: readonly ['only-top', 'only-bottom', 'also-top', 'also-bottom', 'none'];
export type TempoMark = {
    /** The `<direction>` holding this metronome, used to place it inline after preceding
     * tempo `<words>` in the same direction. */
    direction?: Direction;
    duration: string;
    bpm: number;
    dots?: number;
    duration2?: string | null;
    dots2?: number;
    parenthesis?: boolean;
    justify?: 'left' | 'center' | 'right' | null;
    /** The `<metronome>`'s document position (see ScoreReader.positionOf). */
    position?: DocumentPosition | null;
};
/**
 * A `<sound><swing>` instruction: the on-beat:off-beat duration ratio (`first`:`second`)
 * and `unit`, the swung note value in quarter-note beats (eighth = 0.5, 16th = 0.25). An
 * even `first === second` is straight time.
 */
export type Swing = {
    first: number;
    second: number;
    unit: number;
};
/** One of a measure's voices: the staff mdom gives it (its first note's) and its chords. */
export type MeasureVoice = {
    staff: string;
    chords: Chord[];
};
export type StaffVoice = {
    chords: Chord[];
    beamChords: Chord[] | null;
    run: Chord[];
};
/** Which side of the staff a `<direction>` prints on. */
export type Placement = 'above' | 'below';
/**
 * Where a document puts a mark, from its position attributes (see ScoreReader.positionOf):
 * `y` the default-y baseline in px above the staff's top line, or null for none; `dx` and
 * `dy` the relative-x and relative-y, px right and up of the position that applies; `side`
 * the side the default-y implies when the direction names no placement, else null.
 */
export type DocumentPosition = {
    /** Default-x from the measure start (frame offsets use the musical anchor). */
    x?: number | null;
    y: number | null;
    dx: number;
    dy: number;
    side: Placement | null;
};
export type TextFormat = {
    /** The text's vertical alignment on default-y under documentLayout. */
    valign: 'top' | 'middle' | 'bottom' | 'baseline' | null;
    /** The MusicXML font-family the document names, a comma-separated list of faces; null for
     * none. Drawn only under Config.documentFonts. */
    family: string | null;
    italic: boolean | null;
    bold: boolean | null;
    /** The size as a ratio to the element's usual size; 1 when the document sets none. */
    scale: number;
    enclosure: EnclosureShape | 'none' | null;
    /** How many lines run under the text; 0 for none. */
    underline: number;
    /** Degrees clockwise the text turns, -180 to 180; 0 for upright. */
    rotation: number;
    /** Where the text sits on its anchor x, from halign, else justify. */
    align: 'left' | 'center' | 'right' | null;
};
export type Pictogram = {
    kind: 'glyph';
    glyph: string;
    enclosure?: {
        glyphs: string[];
        head: string;
        tip: number;
    };
} | {
    kind: 'text';
    text: string;
} | {
    kind: 'accordion';
    high: boolean;
    middle: number;
    low: boolean;
};
export type PedalMark = {
    lead: Note;
    type: 'start' | 'change' | 'stop';
    number: string;
    line: boolean;
    sign: boolean;
    abbreviated: boolean;
    sostenuto: boolean;
    unmarked: boolean;
};
export type WedgeMark = {
    lead: Note;
    type: 'start' | 'stop';
    number: string;
    crescendo: boolean;
    placement: Placement;
    dash: number[] | null;
    niente: boolean;
    spread: number | null;
    trailing: boolean;
    downbeat?: boolean;
    positioned?: boolean;
};
export type OctaveShiftSpan = {
    notes: Note[];
    octaves: number;
    label: string;
    suffix: string;
    above: boolean;
};
/** How a <bracket> terminates at one of its ends. */
export type LineEnd = 'up' | 'down' | 'arrow' | 'none';
export type DirectionLineSpan = {
    /** Which element drew it, the `<line-width>` type it is drawn at. */
    kind: 'bracket' | 'dashes';
    from: Note;
    to: Note;
    above: boolean;
    dash: number[] | null;
    startEnd: LineEnd;
    stopEnd: LineEnd;
};
export declare const LINE_TYPE_DASH: Record<string, number[] | null>;
export declare function lineDashOf(element: {
    getAttribute(name: string): string | null;
}): number[] | null;
/** A `<part-group>` span: the run of parts it brackets, and the connector to draw. */
export type PartGroup = {
    /** Index into the rendered `parts` array of the group's first and last part. */
    fromPart: number;
    toPart: number;
    symbol: 'brace' | 'bracket' | 'line';
    /** Nesting depth: 0 is outermost, and each level draws further left of the system. */
    depth: number;
    /** The group's `<group-name>`, printed left of its symbol; null when it declares none. */
    name: string | null;
    /** The group's `<group-abbreviation>`, printed in its place on systems after the first. */
    abbreviation: string | null;
};
/** The heading above the first system (see ScoreReader.headerOf). */
export type ScoreHeader = {
    title: string | null;
    /** Centered under the title, top to bottom. */
    subtitles: string[];
    /** Lyricist, poet and translator lines, printed at the left. */
    left: string[];
    /** Composer and arranger lines, printed at the right. */
    right: string[];
    /** SMuFL glyphs from `<credit-symbol>`, centered in a row under the subtitles. */
    symbols: string[];
    /** The copyright lines, centered at the foot of the score. */
    footer: string[];
};
export interface MidBarline {
    beat: number;
    style: string;
    source: Barline;
}
/** A `<barline><fermata>`: the edge it sits on, its shape, and whether it hangs below. */
export type BarlineFermata = {
    location: 'left' | 'right';
    shape: string;
    inverted: boolean;
};
export type MeasureRepeat = {
    /** A left `<repeat direction="forward"/>`: the measure opens a repeat block. */
    repeatBegin: boolean;
    /** A right `<repeat direction="backward"/>`: the measure closes one. */
    repeatEnd: boolean;
    /** How many times a backward repeat plays the block; null when there is no repeat end. */
    repeatTimes: number | null;
    /** The ending (volta) run covering this measure, or null when it's outside one. */
    ending: MeasureEnding | null;
    /** How this measure's own repeat signs and ending bracket are shaped. */
    geometry: BarlineGeometry;
};
/** The `<repeat winged>` values: extensions above and below a repeat sign's thick line. */
export declare const WINGED: readonly ['none', 'straight', 'curved', 'double-straight', 'double-curved'];
export type Winged = (typeof WINGED)[number];
/**
 * The shape attributes on one measure's `<repeat>` and `<ending>` elements. Each is read
 * off the measure's own barlines: an ending's start jog and label offset sit on its
 * `start`, its end jog on its `stop`, so the run's first and last measures carry them.
 * Lengths are in tenths; null means the attribute is absent.
 */
export type BarlineGeometry = {
    beginWinged: Winged;
    endWinged: Winged;
    /** `end-length` on this measure's `start` ending: the bracket's left jog. */
    startJog: number | null;
    /** `end-length` on this measure's `stop` ending: the bracket's right jog. */
    endJog: number | null;
    /** `text-x` on this measure's `start` ending: the label's x from the bracket's start. */
    textX: number | null;
};
export declare const NO_BARLINE_GEOMETRY: BarlineGeometry;
export type MeasureEnding = {
    /** The raw `<ending number>`: a list or range like `"1"`, `"1,2"`, `"1-3"`. */
    number: string;
    /** Whether the run starts here (its bracket's left hook). */
    first: boolean;
    /** Whether the run ends here (its bracket's right hook, and where playback jumps). */
    last: boolean;
    /** The bracket stays open on the right, with no down hook. */
    open: boolean;
    /** `<ending print-object="no">` on the run's start: it still plays, but no bracket is drawn. */
    hidden: boolean;
};
export type StyleSign = {
    kind: 'beat-repeat';
    slashes: number;
    dots: boolean;
} | {
    kind: 'beat-slash';
    unit: number;
    dots: boolean;
};
export type TabBendMark = {
    /** <bend-alter>: 2 is a whole step; negative bends the pitch down. */
    semitones: number;
    release: boolean;
    /** <pre-bend/>: bent before the string is struck. */
    preBend: boolean;
    /** The angled legs of standard notation, or the curved ones of tab (the default). */
    shape: 'curved' | 'angled';
    /** The trimmed <with-bar> text ("dip", "scoop", free text, often empty); null when absent. */
    bar: string | null;
};
export type NoteStyle = {
    hidden: boolean;
    sign: StyleSign | null;
};
export type MeasureStyleMark = {
    kind: 'measure-repeat';
    /** How many measures the repeated pattern holds (the element's text). */
    count: number;
    /** How many slashes the sign carries; 1 unless the document says otherwise. */
    slashes: number;
    /** Which measure of the pattern this is, 0 the first. */
    bar: number;
} | {
    kind: 'beat-repeat';
    slashes: number;
    /** Dots either side of the slashes (`use-dots="yes"`). */
    dots: boolean;
    /** The quarter-note beat each sign starts on. */
    beats: number[];
    /** The measure's length in quarter-note beats. */
    length: number;
} | {
    kind: 'beat-slash';
    /** How long each slash stands for, in quarter-note beats. */
    unit: number;
    /** An augmentation dot after each slash of a dotted unit (`use-dots="yes"`). */
    dots: boolean;
    beats: number[];
    length: number;
};
export type BezierPoint = {
    x: number | null;
    y: number | null;
};
export type DocumentBezier = {
    start: BezierPoint;
    end: BezierPoint;
};
export declare function bezierPointOf(element: MElement, outgoing?: boolean): BezierPoint;
export declare function curveSegmentOf<T extends MElement & {
    members: T[];
    partner: T | null;
}>(marker: T): {
    end: T;
    bezier: DocumentBezier | null;
} | null;
export {};
