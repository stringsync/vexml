import type { Chord, Score } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import {
	FRET_HALF_H,
	FRET_HALF_W,
	NOTEHEAD_HALF_H,
	PAGE_MARGIN_BOTTOM,
} from './constants';
import type { RawMeasure, RawNote } from './geometry-collector';
import type { ScoreLayout } from './layout-planner';
import type { RawGeometry } from './score-drawer';
import type { ScoreReader } from './score-reader';
import type { StavePlan } from './stave-plan';

/*
 * The hit-index geometry of a score before it is drawn, from the layout alone: every measure
 * column at its planned place, with one note per mdom note the draw will collect, each in its
 * measure's box at a share of the width its beat suggests. It stands in for the systems a
 * progressive render has yet to draw, so the score's elements and timeline exist from the start
 * and keep their identities as each system's exact geometry replaces its share of this. Which
 * notes it lists is what matters: it walks the same visible staves and staff voices the draw
 * pass builds its notes from (see DrawPass.buildStave), so the sets agree.
 */
export class ProvisionalGeometry {
	private readonly systemCount: number;
	// Each system's planned top in score space, and the height of its stave stack: the
	// layout plans every system at one pitch (see LayoutPlanner.plan's floorHeight).
	private readonly pitch: number;
	private readonly stack: number;
	// Each part's staves' rows in the system's stave stack, by part index then staff number.
	private readonly rows: Map<string, number>[];

	constructor(
		private readonly reader: ScoreReader,
		private readonly staves: StavePlan,
		private readonly score: Score,
		private readonly layout: ScoreLayout,
	) {
		this.systemCount =
			layout.boxes.reduce(
				(n, b) => (b ? Math.max(n, b.systemIndex + 1) : n),
				0,
			) || 1;
		const stacks =
			layout.floorHeight -
			PAGE_MARGIN_BOTTOM -
			layout.top -
			(this.systemCount - 1) * layout.systemGap;
		this.stack = stacks / this.systemCount;
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

	/* The system measure `m` is laid out on; a measure with no box of its own (one inside a
	 * multirest run) is on its lead's. */
	systemOfMeasure(m: number): number {
		for (let i = Math.min(m, this.layout.boxes.length - 1); i >= 0; i--) {
			const box = this.layout.boxes[i];
			if (box) {
				return box.systemIndex;
			}
		}
		return 0;
	}

	/* Where `system`'s stave stack is planned to start, in score space. */
	systemTop(system: number): number {
		return this.layout.top + system * this.pitch;
	}

	/* Every measure box and note the layout plans, in score space. */
	geometry(): RawGeometry {
		const measures: RawMeasure[] = [];
		const notes: RawNote[] = [];
		const { parts } = this.score;
		// A multirest lead draws the consolidated bar in place of its notes, and a stave under a
		// measure style (a measure repeat, or beat repeats or slashes across the whole measure)
		// draws its sign instead (see DrawPass.buildStave).
		const multiRestLeads = this.reader.multiRestsOf(parts).leads;
		this.layout.boxes.forEach((box, m) => {
			if (!box) {
				return;
			}
			const top = this.systemTop(box.systemIndex);
			measures.push({
				rect: new Rect(box.x, top, box.width, this.stack),
				index: m,
				number: parts[0]?.measures[m]?.number ?? String(m + 1),
				systemIndex: box.systemIndex,
			});
			parts.forEach((part, p) => {
				const measure = part.measures[m];
				if (!measure) {
					return;
				}
				for (const staffNumber of this.staves.visibleNumbers(part)) {
					if (
						multiRestLeads.has(m) ||
						this.reader.measureStyleOf(measure, staffNumber)
					) {
						continue;
					}
					const voices = this.reader.staffVoices(measure, staffNumber);
					const chords = voices.flatMap((voice) => voice.chords);
					const row = this.rows[p]?.get(staffNumber) ?? 0;
					const y = top + (this.layout.staveOffsets[row] ?? 0);
					const isTab = this.staves.isTab(part, staffNumber);
					notes.push(...this.notesOf(chords, m, box.x, box.width, y, isTab));
				}
			});
		});
		return {
			bounds: new Rect(0, 0, this.layout.width, this.layout.floorHeight),
			notes,
			measures,
			chordDiagrams: [],
		};
	}

	// The notes of one stave's chords in measure `m`, spread across its box by beat: a
	// placeholder each, its box the size of a notehead or fret.
	private notesOf(
		chords: Chord[],
		m: number,
		left: number,
		width: number,
		staveTop: number,
		isTab: boolean,
	): RawNote[] {
		const beats = chords.map((chord) => chord.measureBeat ?? 0);
		const span = Math.max(1, ...beats) + 1;
		const notes: RawNote[] = [];
		for (const [i, chord] of chords.entries()) {
			// A tab stave reserves a rest's time with nothing drawn, and a wholly tied-into chord
			// re-strikes no string, so it prints no fret either (see TabVoiceTranslator.tickables).
			if (
				isTab &&
				(chord.lead.isRest ||
					(!chord.lead.isGrace &&
						chord.notes.every((note) =>
							note.ties.some((tie) => tie.tieType === 'stop'),
						)))
			) {
				continue;
			}
			const x = left + (width * (beats[i] ?? 0)) / span;
			for (const mnote of chord.notes) {
				if (isTab) {
					const { string, fret } = mnote;
					if (string === null || fret === null) {
						continue;
					}
					const rect = new Rect(
						x - FRET_HALF_W,
						staveTop - FRET_HALF_H,
						2 * FRET_HALF_W,
						2 * FRET_HALF_H,
					);
					notes.push({
						mnote,
						rect,
						ink: rect,
						chord: chord.notes,
						measureIndex: m,
						tab: { string, fret },
						glyph: null,
					});
				} else {
					const rect = new Rect(
						x,
						staveTop - NOTEHEAD_HALF_H,
						2 * NOTEHEAD_HALF_H,
						2 * NOTEHEAD_HALF_H,
					);
					notes.push({
						mnote,
						rect,
						ink: rect,
						chord: chord.notes,
						measureIndex: m,
						tab: null,
						glyph: null,
					});
				}
			}
		}
		return notes;
	}
}
