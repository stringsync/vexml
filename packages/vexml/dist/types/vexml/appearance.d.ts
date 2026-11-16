export declare class Appearance {
    private readonly lineWidths;
    private readonly distances;
    private readonly glyphs;
    static readonly NONE: Appearance;
    constructor(lineWidths: ReadonlyMap<string, number>, distances: ReadonlyMap<string, number>, glyphs: ReadonlyMap<string, string>);
    lineWidth(type: LineWidthType): number | null;
    distance(type: DistanceType): number | null;
    glyph(type: GlyphType): string | null;
}
export type LineWidthType = 'beam' | 'bracket' | 'dashes' | 'ending' | 'enclosure' | 'extend' | 'heavy barline' | 'leger' | 'light barline' | 'octave shift' | 'pedal' | 'slur middle' | 'slur tip' | 'staff' | 'stem' | 'tie middle' | 'tie tip' | 'tuplet bracket' | 'wedge';
export type DistanceType = 'beam' | 'hyphen';
export type GlyphType = 'c-clef' | 'f-clef' | 'g-clef-ottava-bassa' | 'percussion-clef' | 'quarter-rest' | `octave-shift-${'up' | 'down'}-${8 | 15 | 22}`;
