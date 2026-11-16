import type { RenderContext } from 'vexflow/core';
/** A `[string, fret]` pair: fret `0` = open, `'x'` = muted, else a (relative) fret number. */
export type ChordNote = [number, number | 'x'];
/** A finger barring `fromString`..`toString` at `fret` (a single bar drawn across those strings). */
export type Barre = {
    fromString: number;
    toString: number;
    fret: number;
};
export declare class ChordDiagramGlyph {
    private readonly x;
    private readonly y;
    private readonly style;
    private readonly chord;
    private readonly position;
    private readonly positionText;
    private readonly barres;
    private readonly tuning;
    private readonly title?;
    private readonly unplayed;
    private readonly stringCount;
    private readonly fretCount;
    private readonly width;
    private readonly spacing;
    private readonly fretSpacing;
    private readonly originX;
    private readonly originY;
    private readonly circleRadius;
    private readonly fontSize;
    private readonly barShiftX;
    private readonly bridgeWidth;
    constructor(x: number, y: number, opts: ChordDiagramGlyphOptions);
    /** Title font size: readable regardless of how small the box's own labels get. */
    private get titleSize();
    /** Topmost y the widget draws to (set by draw), so callers can grow the page crop. */
    get top(): number;
    private drawnTop;
    draw(context: RenderContext): void;
    private lightUp;
    private lightBar;
    private line;
    private text;
    private titleText;
}
/** Everything a {@link ChordDiagramGlyph} needs: the chord data plus optional styling. */
export type ChordDiagramGlyphOptions = {
    /** The fretted notes: one `[string, fret]` pair per played/muted string. */
    chord: ChordNote[];
    /** Absolute fret of the top displayed fret line; drawn as a label when > 1. */
    position?: number;
    positionText?: number;
    barres?: Barre[];
    tuning?: string[];
    /** What a muted ('x') string draws above the nut: "X" by default, nothing when empty. */
    unplayed?: string;
    /** Chord name drawn centered above the board (e.g. "G♯m7♭5"). */
    title?: string;
    /** Overall widget width in px (board is 75% of this, centered). */
    width?: number;
    /** Overall widget height in px. */
    height?: number;
    stringCount?: number;
    fretCount?: number;
    /** Draw the tuning letters under the board. */
    showTuning?: boolean;
    /** Line/dot stroke width. */
    strokeWidth?: number;
    /** Foreground (lines, dots, text). */
    color?: string;
    /** Background (open-string circle fill, page). */
    bgColor?: string;
    fontFamily?: string;
    /** Finger-dot radius; defaults to board-width / 18. */
    circleRadius?: number;
    /** Base font size; defaults to board-width / 7. */
    fontSize?: number;
};
/**
 * The chord-data subset: what a source (e.g. MusicXML) describes before render-time
 * geometry is known. Merged with styling to build a diagram.
 */
export type ChordFrame = Pick<ChordDiagramGlyphOptions, 'chord' | 'position' | 'positionText' | 'barres' | 'fretCount' | 'unplayed'>;
