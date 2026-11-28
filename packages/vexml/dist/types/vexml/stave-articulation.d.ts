import { Articulation, type Note } from 'vexflow/core';
export type TieClearance = 'none' | 'notehead' | 'above' | 'below' | 'both';
export interface FermataMarkOptions {
    belowGlyph?: string;
    explicitType?: boolean;
}
export declare class StaveArticulation extends Articulation {
    private tieSides;
    private slurSides;
    private baseLayoutShiftY;
    private baseXShift;
    private isFermata;
    private isBowing;
    private bowingBelowGlyph;
    private fermataBelowGlyph;
    private explicitFermataType;
    private lowerVoiceBelow;
    private explicitPlacement;
    private alignToNotehead;
    private stackShiftY;
    private tremoloTargetX;
    private tremoloBoundY;
    markFermata(opts?: FermataMarkOptions): this;
    get fermata(): boolean;
    /** Mark this articulation as a string bowing sign (up-bow or down-bow) so it stacks outside fingerings. */
    markBowing(belowGlyph?: string): this;
    get bowing(): boolean;
    /** Vertical stacking shift (px) applied on top of beam, tie, slur, and tremolo offsets. */
    setStackShiftY(shift: number): void;
    /** Allow multi-voice placement to route this unplaced mark below the stave for a lower voice. */
    markLowerVoiceBelow(explicitPlacement?: boolean): this;
    /** Align this mark horizontally with its owning notehead when displaced in an adjacent-second chord. */
    markAlignToNotehead(): this;
    /** Move an unplaced mark below the stave in lower-voice double-stemmed writing. */
    placeLowerVoiceBelow(): this;
    /** Invert an unplaced fermata below the stave (e.g. lower voice in double-stemmed writing). */
    invertFermata(): this;
    getLine(): number;
    clearTie(sides: TieClearance): this;
    clearSlur(sides: TieClearance): this;
    setLayoutShiftY(shift: number): void;
    setXShift(x: number): this;
    /**
     * Centre a fermata horizontally at `targetX` over a two-note tremolo and ensure its
     * baseline stays outside `boundY` (above for ABOVE, below for BELOW; Behind Bars p. 188).
     */
    centreOnTremolo(targetX: number, boundY?: number | null): this;
    /** Whether this mark sits outside a slur endpoint on its side of `note`. */
    sitsOutsideSlur(note: Note): boolean;
    /**
     * Ink bounds of this articulation after applying its beam, tie, slur, and tremolo shifts
     * (and optionally its stacking shift). Safe before draw(): restores textLine and layoutShiftY.
     */
    inkBounds(includeStack?: boolean): {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    draw(): void;
    private noteheadOffsetX;
    belowBottomY(): number;
    private tremoloShiftY;
    private slurShiftY;
    private extraLines;
    private ledgerExtraLines;
    private matchesSide;
}
