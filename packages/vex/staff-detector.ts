import { Rect } from 'core/geometry';
import type { InkMap } from './ink-map';

/** A horizontal ink line long enough to be a staff line: its vertical center and x span. */
export interface StaffLine {
	y: number;
	start: number;
	end: number;
}

/** Consecutive staff lines at one spacing: a staff, or a lone line in a group of one. */
export interface LineGroup {
	lines: StaffLine[];
	box: Rect;
}

// Rows that carry about as much ink as the most inked rows do are staff lines (lyric
// extenders and multi-rest bars carry far less). Ink is counted rather than run as one
// stroke because fret numbers and noteheads sit on the line and break it.

/**
 * Finds the staves in a render from its pixels alone: lines that follow one another at one
 * spacing are a staff. Works on any renderer's output, since nothing here asks the
 * renderer where it thinks its staves are.
 */
export class StaffDetector {
	constructor(private readonly ink: InkMap) {}

	/** Every long horizontal line, top to bottom. */
	lines(): StaffLine[] {
		const rows: Array<{ y: number; count: number; run: [number, number] }> = [];
		for (let y = 0; y < this.ink.height; y++) {
			const ink = this.ink.rowInk(y);
			if (ink && ink.count >= this.ink.width * LONG) {
				rows.push({ y, count: ink.count, run: [ink.start, ink.end] });
			}
		}
		// The most inked row is a staff line, so a row well short of it spans a measure
		// or a word, not a system. The most, not the median: a short score has more rows of
		// beams and ties over the long mark than rows of staff line.
		const most = Math.max(0, ...rows.map((row) => row.count));
		// A beam touching a staff can have just enough ink to pass the global cutoff
		// on some rows but not others. Group the long rows before that cutoff, then
		// keep the narrow ridge of staff ink above the beam's shorter rows. A uniform
		// wide beam still has no narrow ridge and is rejected by MAX_THICK below.
		const staffRows: typeof rows = [];
		let bandStart = 0;
		for (let i = 1; i <= rows.length; i++) {
			const row = rows[i];
			const previous = rows[i - 1];
			if (row && previous && row.y === previous.y + 1) {
				continue;
			}
			const band = rows.slice(bandStart, i);
			bandStart = i;
			const peak = Math.max(0, ...band.map((r) => r.count));
			staffRows.push(
				...band.filter(
					(r) => r.count >= most * STAFF && r.count >= peak * RIDGE,
				),
			);
		}

		// A line is a few rows thick: the consecutive rows merge into one line at their center.
		const lines: StaffLine[] = [];
		let first = 0;
		for (let i = 1; i <= staffRows.length; i++) {
			const row = staffRows[i];
			const previous = staffRows[i - 1];
			if (row && previous && row.y === previous.y + 1) {
				continue;
			}
			const thick = staffRows.slice(first, i);
			first = i;
			// A beam or a multi-measure rest bar across a wide system carries as much ink as
			// a staff line, but is several rows thick where a staff line is one or two.
			if (thick.length > MAX_THICK) {
				continue;
			}
			const ys = thick.map((r) => r.y);
			lines.push({
				y: (Math.min(...ys) + Math.max(...ys)) / 2,
				start: Math.min(...thick.map((r) => r.run[0])),
				end: Math.max(...thick.map((r) => r.run[1])),
			});
		}
		return lines;
	}

	/** The lines grouped by spacing. A run of equal gaps is a staff; a line where two
	 * runs meet belongs to the longer one, so a tuplet bracket or extender lying a staff
	 * space off a staff stays a line of its own rather than taking the staff's first line
	 * with it. A line in no run is a group of one. */
	groups(): LineGroup[] {
		const lines = this.lines();
		const gaps = lines.slice(1).map((line, i) => {
			const previous = lines[i] as StaffLine;
			const size = line.y - previous.y;
			return { size, valid: size <= MAX_GAP && overlaps(previous, line) };
		});

		// Runs of gaps alike, each as the inclusive range of gap indices it covers; gap i
		// lies between lines i and i + 1.
		const runs: Array<[number, number]> = [];
		let start = -1;
		for (let i = 0; i <= gaps.length; i++) {
			const gap = gaps[i];
			const reference = start >= 0 ? gaps[start] : undefined;
			if (gap?.valid && reference && alike(gap.size, reference.size)) {
				continue;
			}
			if (start >= 0) {
				runs.push([start, i - 1]);
			}
			start = gap?.valid ? i : -1;
		}

		// Each line's run: a line at the seam of two runs goes to the longer, the earlier
		// on a tie.
		const owner = lines.map(() => -1);
		runs.forEach(([from, to], r) => {
			for (let i = from; i <= to + 1; i++) {
				const current = owner[i] ?? -1;
				const held = runs[current];
				if (current < 0 || (held && to - from > held[1] - held[0])) {
					owner[i] = r;
				}
			}
		});

		const groups: StaffLine[][] = [];
		lines.forEach((line, i) => {
			const last = groups[groups.length - 1];
			const run = owner[i] ?? -1;
			if (last && run >= 0 && run === owner[i - 1]) {
				last.push(line);
			} else {
				groups.push([line]);
			}
		});
		return groups.map((group) => ({ lines: group, box: boxOf(group) }));
	}
}

// The fraction of the image width a row's ink must cover to be a long line at all. A
// staff spans most of the width; a row of noteheads or a beam never gets near this.
const LONG = 0.15;
// The fraction of the most inked row's ink a line must carry to be a staff line rather
// than something drawn along part of one system (an extender, a multi-measure rest bar).
// Low enough that a tab line under a fret number in every measure still counts.
const STAFF = 0.6;
// The widest a staff space can be, in pixels, before two lines are separate staves.
const MAX_GAP = 60;
// The thickest a staff line gets, in rows; a beam is thicker on any renderer.
const MAX_THICK = 3;
// Within a touching band, a staff row extends substantially beyond the beam.
const RIDGE = 0.9;
// How far a gap may stray from its run's first gap and still be the same staff: a fifth,
// or a pixel, since antialiasing moves a line's center by a half.
const TOLERANCE = 0.2;

function alike(gap: number, reference: number): boolean {
	return Math.abs(gap - reference) <= Math.max(1, reference * TOLERANCE);
}

function overlaps(a: StaffLine, b: StaffLine): boolean {
	const shared = Math.min(a.end, b.end) - Math.max(a.start, b.start);
	return shared >= Math.min(a.end - a.start, b.end - b.start) * 0.5;
}

function boxOf(lines: StaffLine[]): Rect {
	const start = Math.min(...lines.map((line) => line.start));
	const end = Math.max(...lines.map((line) => line.end));
	const ys = lines.map((line) => line.y);
	const top = Math.min(...ys);
	return new Rect(start, top, end - start, Math.max(1, Math.max(...ys) - top));
}
