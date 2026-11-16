import { BarNote } from 'vexflow/core';
import type { MeasureRepeat, Winged } from './score-reader.js';
export declare class BarlineTranslator {
    /**
     * Each measure's barline decorations, translated from the repeat rows ScoreReader.measureRepeats
     * reads (playback reads the same rows). An ending run's bracket opens with a left hook (BEGIN),
     * continues hookless (MID), and closes with a right hook (END); BEGIN_END when the run is one
     * measure. A `discontinue` close leaves the bracket open on the right, so it keeps the hookless
     * form.
     */
    decorations(repeats: readonly MeasureRepeat[]): BarlineDecoration[];
    /**
     * A vexflow BarNote for a mid-measure `<barline>`: a zero-duration tickable the formatter
     * places between the notes it divides, so the measure widens to hold it instead of the line
     * landing on a notehead. A style vexflow can't draw becomes an invisible bar of the same
     * width, painted over by the draw pass (see DrawPass.paintBarStyle).
     */
    midBarNote(style: string): BarNote;
    private voltaType;
    private voltaLabel;
}
export declare const BAR_STYLE_TYPES: Record<string, number>;
export type BarlineDecoration = {
    repeatBegin: boolean;
    repeatEnd: boolean;
    /** The printed "Nx" label of a repeat played more than twice, or null. A plain backward
     * repeat means two passes and is drawn by its dots alone. */
    repeatTimesLabel: string | null;
    /** The wings on the opening and closing repeat signs ('none' for plain ones). */
    beginWinged: Winged;
    endWinged: Winged;
    volta: VoltaDecoration | null;
};
/** A measure's piece of a volta bracket: its vexflow Volta type, printed label, and the
 * document's own jog lengths and label offset in tenths (null for the defaults). */
export type VoltaDecoration = {
    type: number;
    label: string;
    startJog: number | null;
    endJog: number | null;
    textX: number | null;
};
export declare const NO_DECORATION: BarlineDecoration;
