import type { Direction, Harmony, Measure } from '@stringsync/mdom';
import { Rect } from '../core/geometry/index.js';
import { type RenderContext, type Stave, StaveNote, TabNote } from 'vexflow/core';
import { Appearance } from './appearance.js';
import { type ChordFrame } from './chord-diagram-glyph.js';
import { CollisionResolver } from './collision-resolver.js';
import type { GeometryCollector } from './geometry-collector.js';
import { type TempoModulation } from './metronome-glyph.js';
import type { DirectionLineSpan, DocumentPosition, HarmonySymbol, Pictogram, Placement, ScoreReader, TempoMark, TextFormat } from './score-reader.js';
import type { SpillTracker } from './spill-tracker.js';
export declare class DirectionPlacer {
    private readonly context;
    private readonly reader;
    private readonly collisionResolver;
    private readonly geometry;
    private readonly spill;
    private readonly reporter;
    private readonly labelFont;
    private readonly documentFonts;
    private readonly documentPositions;
    private readonly notationFont;
    private readonly notationColor;
    private readonly textColor;
    private readonly scratchViewport;
    private readonly appearance;
    private readonly enclosureWidth;
    private readonly soundingDynamic;
    private readonly belowWords;
    private readonly aboveWords;
    private readonly aboveMarks;
    private readonly placedDynamics;
    private readonly dynamics;
    constructor(context: RenderContext, reader: ScoreReader, collisionResolver: CollisionResolver, geometry: GeometryCollector, spill: SpillTracker, reporter: DirectionReporter, opts: DirectionPlacerOptions);
    mark(): Map<string, {
        text: string;
        measure: number;
    }>;
    rewind(mark: ReadonlyMap<string, {
        text: string;
        measure: number;
    }>): void;
    suppressesDynamic(key: string, text: string, measureIndex: number): boolean;
    dynamicsOn(stave: Stave): readonly Rect[];
    belowWordsOn(stave: Stave): readonly Rect[];
    aboveAnnotationsOn(stave: Stave): readonly Rect[];
    private recordAboveMark;
    placeColumn(column: DirectionColumn): void;
    private drawBarlineFermata;
    private drawRehearsal;
    private measureTempo;
    private drawTempo;
    private harmonyRun;
    private harmonyLayout;
    private drawHarmony;
    private wordsAnchor;
    private openingTempoAnchorX;
    private openingTimeSignatureX;
    private openingRepeatX;
    private directiveX;
    private wordsAlign;
    private faceOf;
    private decorationOf;
    private placeWord;
    private drawWords;
    private xOf;
    private followed;
    private pins;
    private baselineOf;
    private sideOf;
    private drawGlyphsBetween;
    private drawPictogram;
    private placeBeside;
    drawDirectionLines(lines: readonly DirectionLineTask[]): void;
}
/**
 * One measure's metronome mark(s): the rate from a `<beat-unit>` metronome, the note-group
 * relation from a `<metronome-note>` one, or both. At least one is non-null.
 */
export type TempoTask = {
    /** The `<direction>` holding this metronome, matched against preceding tempo words. */
    direction?: Direction;
    tempo: TempoMark | null;
    /** Marks drawn as note glyphs after the bpm mark, left to right. */
    modulations: TempoModulation[];
    /** Which part of the mark sits on its anchor; the first mark's `justify`. */
    justify: 'left' | 'center' | 'right' | null;
    /** The first mark's document position (see ScoreReader.positionOf). Absent or null
     * means it sets none. */
    position?: DocumentPosition | null;
};
/** A queued chord symbol (or fret diagram) and what to print there. */
export type HarmonyTask = {
    staveNote: StaveNote | TabNote;
    text: string;
    symbol: HarmonySymbol;
    frame: ChordFrame | null;
    placement: Placement;
    source: Harmony;
    /** The <harmony>'s document position (see ScoreReader.positionOf), followed for the
     * plain-text symbol. Absent or null means it sets none. */
    position?: DocumentPosition | null;
    framePosition?: DocumentPosition | null;
};
/** A queued words direction, drawn on its stave's `placement` side at the laid-out x of
 * the note it applies to. */
export type WordsTask = {
    dynamicDirection?: Direction;
    /** The `<direction>` holding this word when a `<metronome>` follows it inline. */
    tempoDirection?: Direction;
    stave: Stave;
    text: string;
    /** The text is a SMuFL glyph (an <other-direction smufl>), drawn in the notation font.
     * Absent means it is words. */
    glyph?: boolean;
    anchor: StaveNote | TabNote | undefined;
    placement: Placement;
    opensBar?: boolean;
    closesBar?: boolean;
    directive?: boolean;
    tempo?: boolean;
    explicitSize?: boolean;
    /** The <words> element's formatting. Absent means the document asks for none. */
    format?: TextFormat;
    /** The <words> element's document position (see ScoreReader.positionOf). Absent or null
     * means it sets none. */
    position?: DocumentPosition | null;
};
/** A queued `<barline><fermata>`: the part stave it sits over (the top one) or under (the
 * bottom one, when inverted) and the edge of that stave's measure it holds. */
export type BarlineFermataTask = {
    stave: Stave;
    location: 'left' | 'right';
    shape: string;
    inverted: boolean;
};
/** A queued dynamics marking: a words task plus whether the marking spells out of SMuFL's
 * dynamic letters (and so engraves as glyphs in the notation font). */
export type DynamicsTask = {
    direction?: Direction;
    stave: Stave;
    text: string;
    glyph: boolean;
    anchor: StaveNote | TabNote | undefined;
    placement: Placement;
    /** The <dynamics> element's formatting. Absent means the document asks for none. */
    format?: TextFormat;
    /** The <dynamics> element's document position (see ScoreReader.positionOf). Absent or
     * null means it sets none. */
    position?: DocumentPosition | null;
};
/** A queued symbol-style direction: the SMuFL string it engraves, centered on its note. */
export type SymbolTask = {
    stave: Stave;
    /** The lower stave of a grand-staff pair when a damping sign sits between the two staves. */
    lowerStave?: Stave;
    glyph: string;
    anchor: StaveNote | TabNote | undefined;
    placement: Placement;
    /** The damping sign falls on beat 1 of its measure, so on a centered whole-measure rest
     * it sits just after the opening barline instead of centered over the rest. */
    opensBar?: boolean;
};
/** A queued <harp-pedals> diagram: the glyph string, divider included. */
export type HarpPedalTask = {
    stave: Stave;
    /** The lower stave of a grand-staff pair when the diagram sits between the two staves. */
    lowerStave?: Stave;
    glyphs: string;
    anchor: StaveNote | TabNote | undefined;
    placement: Placement;
    /** The <harp-pedals> element's document position (see ScoreReader.positionOf). Absent
     * or null means it sets none. */
    position?: DocumentPosition | null;
};
/** A queued percussion pictogram, accordion registration or scordatura, drawn on its
 * stave's `placement` side at the laid-out x of the note it applies to. */
export type PictogramTask = {
    stave: Stave;
    symbol: Pictogram;
    anchor: StaveNote | TabNote | undefined;
    placement: Placement;
};
/** A queued <figured-bass> stack. `figures` is the whole stack, top row first; it draws as
 * one row per figure under the stave. */
export type FiguredBassTask = {
    stave: Stave;
    figures: string[];
    anchor: StaveNote | TabNote | undefined;
    /** The stack's document position (see ScoreReader.positionOf), which its top figure
     * takes; the rest stack under it. Absent or null means it sets none. */
    position?: DocumentPosition | null;
};
/** A <bracket>/<dashes> span with its endpoint notes as drawn; undefined when an endpoint
 * sits on a hidden staff. */
export type DirectionLineTask = {
    span: DirectionLineSpan;
    start: StaveNote | undefined;
    stop: StaveNote | undefined;
};
export interface DirectionColumn {
    measureIndex: number;
    systemIndex: number;
    /** Whether this column opens a system (affecting system-opening repeat-sign tempo alignment). */
    isSystemStart: boolean;
    /** The system's top stave at this column, where measure-level marks print; undefined
     * until a stave exists. */
    topStave: Stave | undefined;
    /** The first part's measure: a rehearsal or navigation mark belongs to the measure
     * rather than to one part (every part carries the same one), so it's read from the
     * first part like the barline decorations. */
    measure: Measure | undefined;
    /** The printed "Nx" label of a repeat played more than twice, or null. */
    repeatTimesLabel: string | null;
    fermatas: readonly BarlineFermataTask[];
    words: readonly WordsTask[];
    dynamics: readonly DynamicsTask[];
    symbols: readonly SymbolTask[];
    pictograms: readonly PictogramTask[];
    figuredBasses: readonly FiguredBassTask[];
    harpPedals: readonly HarpPedalTask[];
    harmonies: readonly HarmonyTask[];
    tempos: ReadonlyArray<{
        stave: Stave;
    } & TempoTask>;
    /** Tab staves opening the score with a `<capo>`, printed "Capo N" over their left edge. */
    capos: ReadonlyArray<{
        stave: Stave;
        fret: number;
    }>;
}
export interface DirectionReporter {
    /** Which stave row (of the current measure column) a stave sits on: the collision
     * band its text registers under. */
    rowOf(stave: Stave): number | undefined;
    /** How far an above-stave annotation reached over its stave, so pass two opens the gap
     * to the stave above wide enough to hold it. */
    recordAnnotationSpill(stave: Stave, rect: Rect): void;
    /** The below-stave mirror of recordAnnotationSpill: how far a below-stave annotation
     * reached under its stave (also grows the page and system bottoms). */
    recordAnnotationDrop(stave: Stave, rect: Rect): void;
    /** A below-stave dynamic (or its inline qualifier) landed at `rect` on `stave` in
     * `system`: have any lyrics on that stave hang clear of it on the next pass. */
    dropLyricsBelow(system: number, stave: Stave, rect: Rect): void;
    /** Ink that reached `top`: keeps the page crop above it. */
    growPageTop(top: number): void;
    /** Ink that reached `bottom`: keeps the page crop below it. */
    growPageBottom(bottom: number): void;
}
export interface DirectionPlacerOptions {
    /** The face beside-stave text is typed in. */
    labelFont: string;
    /** Type text in the face its document names, over labelFont (Config.documentFonts).
     * Absent means labelFont alone. */
    documentFonts?: boolean;
    /** Whether a mark's own default-y, relative-x and relative-y place it
     * (Config.layout.documentLayout): 'follow' takes the document's position as the mark's
     * natural one and still clears it of what is placed, 'strict' pins it there. Absent
     * ignores the document's positions. */
    documentPositions?: 'follow' | 'strict';
    /** The SMuFL face for markings that engrave as music (dynamics, segno/coda,
     * pictograms). */
    notationFont: string;
    notationColor: string;
    textColor: string;
    /** The drawable region of the scratch canvas; a mark anchored near its right edge is
     * nudged back inside rather than clipped. */
    scratchViewport: Rect;
    /** The document's line widths for brackets, dashes and enclosures. Absent means vexml's
     * own. */
    appearance?: Appearance;
}
