import { Rect } from 'webappwiz/geometry';
import type { InkMap } from './ink-map';
import { type LineGroup, StaffDetector } from './staff-detector';

export const FINDING_KINDS = [
	'blank',
	'clipped',
	'staves-collide',
	'stray-line',
] as const;
export type FindingKind = (typeof FINDING_KINDS)[number];

/** One thing wrong with a render, and the pixels where it is. */
export interface Finding {
	kind: FindingKind;
	message: string;
	box: Rect;
}

/** What a lint says about one render: a 0..100 score and what cost it points. */
export interface LintReport {
	score: number;
	findings: Finding[];
}

/**
 * Judges a render from its pixels, the way xmllint judges a MusicXML file from its text:
 * mechanical checks for what a picture of notation must never do, each with where it
 * happened. Nothing here knows which renderer drew the image, so the same lint reads
 * vexml and the reference renderers alike. The score starts at 100 and each finding
 * takes its kind's penalty off it.
 */
export class RenderLint {
	constructor(private readonly ink: InkMap) {}

	lint(): LintReport {
		if (this.ink.isBlank) {
			return {
				score: 0,
				findings: [
					{ kind: 'blank', message: 'nothing was drawn', box: this.ink.bounds },
				],
			};
		}
		const groups = new StaffDetector(this.ink).groups();
		const findings = [
			...this.clipped(),
			...this.collidingStaves(groups),
			...this.strayLines(groups),
		];
		const penalty = findings.reduce((sum, f) => sum + PENALTY[f.kind], 0);
		return { score: Math.max(0, 100 - penalty), findings };
	}

	// Every renderer pads its capture, so ink on the outermost row or column was cut off,
	// not merely drawn near the edge.
	private clipped(): Finding[] {
		const { width, height } = this.ink;
		const edges: Array<{
			name: string;
			runs: Array<[number, number]>;
			box: (s: number, e: number) => Rect;
		}> = [
			{
				name: 'top',
				runs: this.ink.rowRuns(0),
				box: (s, e) => new Rect(s, 0, e - s, 1),
			},
			{
				name: 'bottom',
				runs: this.ink.rowRuns(height - 1),
				box: (s, e) => new Rect(s, height - 1, e - s, 1),
			},
			{
				name: 'left',
				runs: this.ink.columnRuns(0),
				box: (s, e) => new Rect(0, s, 1, e - s),
			},
			{
				name: 'right',
				runs: this.ink.columnRuns(width - 1),
				box: (s, e) => new Rect(width - 1, s, 1, e - s),
			},
		];
		return edges.flatMap((edge) =>
			merge(edge.runs).map(([start, end]) => ({
				kind: 'clipped' as const,
				message: `ink runs off the ${edge.name} edge over ${end - start}px`,
				box: edge.box(start, end),
			})),
		);
	}

	// Two staves closer than one staff space have nothing between them for notes, text or
	// the ledger lines that belong to either. How many lines a staff has is the score's to
	// say (<staff-lines>), so no count is wrong; it takes three to trust the spacing, and
	// a lone line is judged by strayLines instead.
	private collidingStaves(groups: LineGroup[]): Finding[] {
		const staves = groups.filter((group) => group.lines.length >= STAFF_LINES);
		return staves.slice(1).flatMap((lower, i) => {
			const upper = staves[i];
			if (!upper) {
				return [];
			}
			const space = upper.box.h / (upper.lines.length - 1);
			const gap = lower.box.top - upper.box.bottom;
			const beside =
				upper.box.left < lower.box.right && lower.box.left < upper.box.right;
			if (gap >= space || !beside) {
				return [];
			}
			return [
				{
					kind: 'staves-collide' as const,
					message: `staves ${Math.round(gap)}px apart, under one staff space of ${Math.round(space)}px`,
					box: upper.box.union(lower.box),
				},
			];
		});
	}

	// A lone line across the system within a staff space of a staff is ink the staff
	// didn't draw: another staff drawn into it (its lines no longer keep one spacing, so
	// they fall out of their run), or a spanner lying on it.
	private strayLines(groups: LineGroup[]): Finding[] {
		const staves = groups.filter((group) => group.lines.length >= STAFF_LINES);
		return groups
			.filter((group) => group.lines.length === 1)
			.flatMap((lone) => {
				const near = staves.find((staff) => {
					const space = staff.box.h / (staff.lines.length - 1);
					const reach = new Rect(
						staff.box.x,
						staff.box.y - space,
						staff.box.w,
						staff.box.h + 2 * space,
					);
					return reach.intersects(lone.box.translate(0, -0.5));
				});
				if (!near) {
					return [];
				}
				return [
					{
						kind: 'stray-line' as const,
						message:
							'a line across the system within a staff space of a staff: a staff drawn into it, or a spanner lying on it',
						box: lone.box,
					},
				];
			});
	}
}

// Lines at one spacing it takes to trust that spacing as a staff's.
const STAFF_LINES = 3;

const PENALTY: Record<FindingKind, number> = {
	blank: 100,
	clipped: 15,
	'staves-collide': 20,
	'stray-line': 20,
};

// Antialiasing breaks one shape's edge contact into several runs; a few pixels apart,
// they are the same clip.
function merge(runs: Array<[number, number]>): Array<[number, number]> {
	const merged: Array<[number, number]> = [];
	for (const [start, end] of [...runs].sort((a, b) => a[0] - b[0])) {
		const last = merged[merged.length - 1];
		if (last && start - last[1] <= 4) {
			last[1] = Math.max(last[1], end);
		} else {
			merged.push([start, end]);
		}
	}
	return merged;
}
