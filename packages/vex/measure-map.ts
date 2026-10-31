import type { Rect } from 'core/geometry';

/** A measure as an engine laid it out: its MusicXML number and where it sits in the PNG. */
export interface PlacedMeasure {
	number: string;
	box: Rect;
}

/**
 * Where each measure of a render sits, so a finding's pixel box can say which measures
 * it is in: an agent fixing a finding wants a measure to slice, not a pixel box. The
 * measures come in score order, and the numbers a box names keep it.
 */
export class MeasureMap {
	constructor(private readonly measures: readonly PlacedMeasure[]) {}

	/** The numbers of the measures the box overlaps or, when it overlaps none, of the
	 * nearest ones: ink clipped at the canvas edge above the first system lies outside
	 * every measure's box, yet belongs to the measures under it. */
	numbersAt(box: Rect): string[] {
		const gaps = this.measures.map((measure) => gap(measure.box, box));
		const nearest = Math.min(...gaps);
		if (!Number.isFinite(nearest)) {
			return [];
		}
		const numbers = this.measures
			.filter((_, i) => (gaps[i] ?? Infinity) <= nearest + SLACK)
			.map((measure) => measure.number);
		return [...new Set(numbers)];
	}
}

/** "measure 3", "measures 3-5", "measures 1, 4-6, X1": consecutive whole numbers read
 * as a range. Empty when there are no measures to name. */
export function describeMeasures(numbers: readonly string[]): string {
	if (numbers.length === 0) {
		return '';
	}
	const runs: string[][] = [];
	for (const number of numbers) {
		const run = runs[runs.length - 1];
		const last = run?.[run.length - 1];
		if (run && last !== undefined && follows(last, number)) {
			run.push(number);
		} else {
			runs.push([number]);
		}
	}
	const parts = runs.map((run) =>
		run.length === 1 ? run[0] : `${run[0]}-${run[run.length - 1]}`,
	);
	return `${numbers.length === 1 ? 'measure' : 'measures'} ${parts.join(', ')}`;
}

// Measures of one system share their top and bottom only to within a pixel or two of
// rounding, and a finding beside the system names all of them, not the one that won it.
const SLACK = 2;

// How far apart two rects are: 0 when they touch or overlap.
function gap(a: Rect, b: Rect): number {
	const dx = Math.max(0, a.left - b.right, b.left - a.right);
	const dy = Math.max(0, a.top - b.bottom, b.top - a.bottom);
	return Math.hypot(dx, dy);
}

function follows(previous: string, next: string): boolean {
	return (
		/^\d+$/.test(previous) &&
		/^\d+$/.test(next) &&
		Number(next) === Number(previous) + 1
	);
}
