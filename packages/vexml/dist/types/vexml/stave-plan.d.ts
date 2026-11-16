import type { Part } from '@stringsync/mdom';
export interface StaveVisibility {
    showTabs: boolean;
    showNotation: boolean;
}
export declare class StavePlan {
    private readonly visibility;
    private readonly tunings;
    private readonly tabs;
    private readonly visible;
    private readonly symbols;
    constructor(visibility: StaveVisibility);
    /**
     * The open-string MIDI pitches of a tab staff's `<staff-tuning>`, indexed by string
     * number - 1 (so index 0 = string 1 = the highest-sounding string). MusicXML numbers
     * tuning *lines* from the bottom up and strings from the top down, so they invert:
     * string = lineCount - line + 1.
     *
     * Null when the staff declares no tunings: there is nothing to derive a fret from, so
     * callers keep their explicit-fret-only behavior rather than guessing a tuning.
     */
    tuningOf(part: Part, staffNumber: string): number[] | null;
    private readTuning;
    /** A staff is tablature when its clef sign is TAB, or when `<staff-details>` gives it
     * string tunings, some exporters (Guitar Pro among them) notate a tab staff with an
     * octave-down treble clef, so the clef sign alone doesn't settle it. A staff's clef is
     * stable across a part, so the first measure that declares either settles it. */
    isTab(part: Part, staffNumber: string): boolean;
    private readIsTab;
    /** The part's `<staves>` count, raised to the highest numbered `<clef>` it declares: some
     * exporters (Partitura's piano scores) omit `<staves>` but still number two clefs and
     * write notes on staff 2, which would otherwise collapse onto one staff. */
    private staveCountOf;
    /** The staff numbers ('1', '2', …) a part renders, in order. All of them normally; with
     * showTabs off its tablature staves are dropped, with showNotation off its notation staves
     * are. A notation+tab part then shows only the kept kind, and a part of the dropped kind
     * alone shows nothing. Layout and draw both iterate this so their stave rows (and the
     * offsets/connectors keyed off them) stay aligned. */
    visibleNumbers(part: Part): string[];
    /** How many staves the parts in the run `from..to` (inclusive) render. */
    groupStaveCount(parts: readonly Part[], span: {
        fromPart: number;
        toPart: number;
    }): number;
    /** True when every stave the part renders is tablature. */
    isAllTab(part: Part): boolean;
    pairsTabWithNotation(part: Part): boolean;
    partsPairTabWithNotation(parts: Part[]): boolean;
    symbolOf(part: Part): 'brace' | 'bracket' | null;
    systemSymbol(parts: Part[]): 'brace' | 'bracket' | null;
    systemOverhang(parts: Part[]): number;
    private readSymbol;
    /** True when `<staff-details>` gives this staff both string tunings and an explicit
     * `<staff-lines>`: the MusicXML signal for tablature that doesn't depend on the clef.
     *
     * Tunings alone are not enough: Guitar Pro copies a guitar's six `<staff-tuning>`s onto
     * the *notation* staff of a notation+tab part (and onto unrelated parts sharing the
     * instrument), where they mean nothing. A real tab staff always sizes itself with
     * `<staff-lines>`, so requiring both keeps those spurious tunings from turning notation
     * staves into tab. StaffDetails is what makes this askable: Measure.getStaveLines applies
     * the 5-line default, which erases the difference between declared and absent. */
    private hasStaffTuning;
}
