import type { Chord, Note as MNote, Score } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
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
	// Each measure's placeholders, read off the document once: a progressive render asks again
	// for every undrawn measure as the forecast moves.
	private readonly placeholders = new Map<number, Placeholder[]>();
	private multiRestLeads: ReadonlyMap<number, number> | null = null;

	constructor(
		private readonly reader: ScoreReader,
		private readonly staves: StavePlan,
		private readonly score: Score,
		private readonly layout: Pick<
			ScoreLayout,
			'top' | 'floorHeight' | 'systemGap' | 'staveOffsets' | 'width'
		>,
	) {
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
				// Its staves are known once drawn (see ElementPlacer.place).
				staves: [],
			});
			for (const p of this.placeholdersOf(m)) {
				const x = box.x + (box.width * p.beat) / p.span;
				const y = top + (this.layout.staveOffsets[p.row] ?? 0);
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

	// The notes the draw will collect in measure `m`, each on its stave at its share of the box.
	private placeholdersOf(m: number): Placeholder[] {
		let placeholders = this.placeholders.get(m);
		if (placeholders) {
			return placeholders;
		}
		placeholders = [];
		const { parts } = this.score;
		// A multirest lead draws the consolidated bar in place of its notes, and a stave under a
		// measure style (a measure repeat, or beat repeats or slashes across the whole measure)
		// draws its sign instead (see DrawPass.buildStave).
		this.multiRestLeads ??= this.reader.multiRestsOf(parts).leads;
		for (const [p, part] of parts.entries()) {
			const measure = part.measures[m];
			if (!measure) {
				continue;
			}
			for (const staffNumber of this.staves.visibleNumbers(part)) {
				if (
					this.multiRestLeads.has(m) ||
					this.reader.measureStyleOf(measure, staffNumber)
				) {
					continue;
				}
				const voices = this.reader.staffVoices(measure, staffNumber);
				const chords = voices.flatMap((voice) => voice.chords);
				const row = this.rows[p]?.get(staffNumber) ?? 0;
				placeholders.push(
					...this.staveOf(chords, row, this.staves.isTab(part, staffNumber)),
				);
			}
		}
		this.placeholders.set(m, placeholders);
		return placeholders;
	}

	// The notes of one stave's chords, spread across the box by beat: a placeholder each, its
	// box the size of a notehead or fret.
	private staveOf(chords: Chord[], row: number, isTab: boolean): Placeholder[] {
		const beats = chords.map((chord) => chord.measureBeat ?? 0);
		const span = Math.max(1, ...beats) + 1;
		const placeholders: Placeholder[] = [];
		for (const [i, chord] of chords.entries()) {
			// A tab stave reserves a rest's time with nothing drawn, and a wholly tied-into chord
			// re-strikes no string, so it prints no fret either (see TabVoiceTranslator.tickables).
			if (
				isTab &&
				(chord.lead.isRest ||
					(!chord.lead.isGrace &&
						chord.notes.every((note) =>
							this.reader.tiesOf(note).some((tie) => tie.tieType === 'stop'),
						)))
			) {
				continue;
			}
			const beat = beats[i] ?? 0;
			for (const mnote of chord.notes) {
				let tab: RawNote['tab'] = null;
				if (isTab) {
					const { string, fret } = mnote;
					if (string === null || fret === null) {
						continue;
					}
					tab = { string, fret };
				}
				placeholders.push({
					mnote,
					chord: chord.notes,
					beat,
					span,
					row,
					tab,
				});
			}
		}
		return placeholders;
	}
}

/* One note of the forecast geometry before it has a box: its beat of the `span` its stave's
 * chords spread across the measure's width, and its stave's row in the system's stack. */
interface Placeholder {
	mnote: MNote;
	chord: MNote[];
	beat: number;
	span: number;
	row: number;
	tab: RawNote['tab'];
}
