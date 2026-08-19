import { Barline, BarNote, Volta } from 'vexflow';
import type { MeasureEnding, MeasureRepeat } from './score-reader';

/*
 * The MusicXML <bar-style> values vexflow's own Barline draws. Its Barline knows four
 * non-repeat types and MusicXML names nine, so the rest (dotted, dashed, heavy, tick, …)
 * have no type here and are painted by DrawPass.paintBarStyle. 'regular' is the plain
 * single line, the style an absent <bar-style> means.
 */
export const BAR_STYLE_TYPES: Record<string, number> = {
	regular: Barline.type.SINGLE,
	'light-light': Barline.type.DOUBLE,
	'light-heavy': Barline.type.END,
	none: Barline.type.NONE,
};

/** The width a mid-measure divider with no vexflow type of its own reserves, matching the
 * SINGLE barline it is painted in place of. */
const CUSTOM_MID_BAR_WIDTH = 8;

// What a measure's <barline>s ask the renderer to draw at its edges: repeat dots (as a vexflow
// Barline type) and the volta bracket over it (as a vexflow Volta type + its printed label).
export type BarlineDecoration = {
	repeatBegin: boolean;
	repeatEnd: boolean;
	/** The printed "Nx" label of a repeat played more than twice, or null. A plain backward
	 * repeat means two passes and is drawn by its dots alone. */
	repeatTimesLabel: string | null;
	volta: { type: number; label: string } | null;
};

export const NO_DECORATION: BarlineDecoration = {
	repeatBegin: false,
	repeatEnd: false,
	repeatTimesLabel: null,
	volta: null,
};

/*
 * Translates mdom measure repeats to the decorations a `<barline>` draws: the repeat dots and
 * volta brackets at a measure's edges, plus the vexflow BarNote a mid-measure one puts between
 * two notes.
 */
export class BarlineTranslator {
	/**
	 * Each measure's barline decorations, translated from the repeat rows ScoreReader.measureRepeats
	 * reads (playback reads the same rows). An ending run's bracket opens with a left hook (BEGIN),
	 * continues hookless (MID), and closes with a right hook (END) — BEGIN_END when the run is one
	 * measure. A `discontinue` close leaves the bracket open on the right, so it keeps the hookless
	 * form.
	 */
	decorations(repeats: readonly MeasureRepeat[]): BarlineDecoration[] {
		return repeats.map(({ repeatBegin, repeatEnd, repeatTimes, ending }) => ({
			repeatBegin,
			repeatEnd,
			// <repeat times> counts the total passes, and two is what a repeat sign already
			// says, so only three or more is worth printing.
			repeatTimesLabel:
				repeatEnd && repeatTimes && repeatTimes > 2 ? `${repeatTimes}x` : null,
			volta: ending && {
				type: this.voltaType(ending),
				label: this.voltaLabel(ending.number),
			},
		}));
	}

	/**
	 * A vexflow BarNote for a mid-measure `<barline>`: a zero-duration tickable the formatter
	 * places between the notes it divides, so the measure widens to hold it instead of the line
	 * landing on a notehead. A style vexflow can't draw becomes an invisible bar of the same
	 * width, painted over by the draw pass (see DrawPass.paintBarStyle).
	 */
	midBarNote(style: string): BarNote {
		const type = BAR_STYLE_TYPES[style];
		if (type === undefined) {
			return new BarNote(Barline.type.NONE).setWidth(CUSTOM_MID_BAR_WIDTH);
		}
		return new BarNote(type);
	}

	private voltaType(ending: MeasureEnding): number {
		const hooked = ending.last && !ending.open;
		if (ending.first) {
			return hooked ? Volta.type.BEGIN_END : Volta.type.BEGIN;
		}
		return hooked ? Volta.type.END : Volta.type.MID;
	}

	/* "1" -> "1.", "1,2" -> "1., 2." — the printed form of an `<ending>`'s number list. */
	private voltaLabel(number: string): string {
		return number
			.split(',')
			.map((part) => `${part.trim()}.`)
			.join(' ');
	}
}
