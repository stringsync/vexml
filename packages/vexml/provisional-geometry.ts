import type { Score } from '@stringsync/mdom';
import { Rect } from 'core/geometry';
import {
	FRET_HALF_H,
	FRET_HALF_W,
	NOTEHEAD_HALF_H,
	PAGE_MARGIN_BOTTOM,
} from './constants';
import type { RawMeasure, RawNote } from './geometry-collector';
import type { LayoutForecast } from './layout-plan';
import type { ScoreLayout } from './layout-planner';
import type { RawGeometry } from './score-drawer';
import type { ScoreReader } from './score-reader';
import { SoundingNotes } from './sounding-notes';
import type { StavePlan } from './stave-plan';

/*
 * The hit-index geometry of a score before it is drawn, from the layout's forecast alone (see
 * LayoutPlan.forecast): every measure column at its forecast place, with one note per mdom note
 * the draw will collect, each in its measure's box at a share of the width its beat suggests.
 * It stands in for the systems a progressive render has yet to draw, so the score's elements
 * and timeline exist from the start and keep their identities as each system's exact geometry
 * replaces its share of this. Which notes it lists is what matters: it walks the same visible
 * staves and staff voices the draw pass builds its notes from (see DrawPass.buildStave), so the
 * sets agree.
 */
export class ProvisionalGeometry {
	// Each system's stave stack height, and its pitch down the page: the layout plans every
	// system at one height (see LayoutPlanner.plan's floorHeight), a gap apart.
	private readonly stack: number;
	private readonly pitch: number;
	// Each part's staves' rows in the system's stave stack, by part index then staff number.
	private readonly rows: Map<string, number>[];
	private readonly sounding: SoundingNotes;

	constructor(
		readonly reader: ScoreReader,
		readonly staves: StavePlan,
		private readonly score: Score,
		private readonly layout: Pick<
			ScoreLayout,
			'top' | 'floorHeight' | 'systemGap' | 'staveOffsets' | 'width'
		>,
	) {
		this.sounding = new SoundingNotes(reader, staves, score.parts);
		this.stack = layout.floorHeight - PAGE_MARGIN_BOTTOM - layout.top;
		this.pitch = this.stack + layout.systemGap;
		let row = 0;
		this.rows = score.parts.map((part) => {
			const rows = new Map<string, number>();
			for (const staffNumber of staves.visibleNumbers(part)) {
				rows.set(staffNumber, row++);
			}
			return rows;
		});
	}

	/* Where `system`'s stave stack is forecast to start, in score space. */
	systemTop(system: number): number {
		return this.layout.top + system * this.pitch;
	}

	/* Every measure box and note `forecast` places, or only those of `measures`, in score
	 * space. */
	geometryOf(
		forecast: LayoutForecast,
		measures: Iterable<number> = forecast.boxes.keys(),
	): RawGeometry {
		const columns: RawMeasure[] = [];
		const notes: RawNote[] = [];
		const { parts } = this.score;
		for (const m of measures) {
			const box = forecast.boxes[m];
			if (!box) {
				continue;
			}
			const top = this.systemTop(box.systemIndex);
			columns.push({
				rect: new Rect(box.x, top, box.width, this.stack),
				index: m,
				number: parts[0]?.measures[m]?.number ?? String(m + 1),
				systemIndex: box.systemIndex,
				// Its staves and barlines are known once drawn (see ElementPlacer.place).
				staves: [],
				barlines: [],
			});
			for (const p of this.sounding.of(m)) {
				const x = box.x + (box.width * p.beat) / p.span;
				const row = this.rows[p.part]?.get(p.staffNumber) ?? 0;
				const y = top + (this.layout.staveOffsets[row] ?? 0);
				const rect = p.tab
					? new Rect(
							x - FRET_HALF_W,
							y - FRET_HALF_H,
							2 * FRET_HALF_W,
							2 * FRET_HALF_H,
						)
					: new Rect(
							x,
							y - NOTEHEAD_HALF_H,
							2 * NOTEHEAD_HALF_H,
							2 * NOTEHEAD_HALF_H,
						);
				notes.push({
					mnote: p.mnote,
					rect,
					ink: rect,
					chord: p.chord,
					measureIndex: m,
					tab: p.tab,
					glyph: null,
				});
			}
		}
		const height =
			this.layout.top +
			forecast.systemCount * this.pitch -
			this.layout.systemGap +
			PAGE_MARGIN_BOTTOM;
		return {
			bounds: new Rect(0, 0, this.layout.width, height),
			notes,
			measures: columns,
			chordDiagrams: [],
		};
	}
}
