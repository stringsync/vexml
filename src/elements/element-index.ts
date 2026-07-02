import type { Note as MNote } from '@stringsync/mdom';
import type { Rect } from '../geometry';
import type { ChordDiagram } from './chord-diagram';
import type { Element } from './element';
import type { HitTester } from './hit-tester';
import type { MeasureBox } from './measure-box';
import type { Note } from './note';
import type { Part } from './part';
import type { System } from './system';
import type { TabPosition } from './tab-position';

/*
 * Every element built for a rendered score: enumeration by kind, the musical (parts) and layout
 * (systems) axes, plus the spatial queries (score-space points/rects). Identities are stable for
 * the Score's lifetime — the playback timeline references the very same Notes hit-testing
 * returns (see noteLookup).
 */
export class ElementIndex {
	constructor(
		private readonly hitTester: HitTester,
		private readonly noteByMnote: ReadonlyMap<MNote, Note>,
		private readonly boxByIndex: ReadonlyMap<number, MeasureBox>,
		private readonly tabByMnote: ReadonlyMap<MNote, TabPosition>,
		private readonly diagramList: readonly ChordDiagram[],
		private readonly partList: readonly Part[],
		private readonly systemList: readonly System[],
	) {}

	all(): Element[] {
		return [
			...this.notes(),
			...this.measureBoxes(),
			...this.tabPositions(),
			...this.chordDiagrams(),
			...this.systems(),
		];
	}

	notes(): Note[] {
		return [...this.noteByMnote.values()];
	}

	measureBoxes(): MeasureBox[] {
		return [...this.boxByIndex.values()];
	}

	tabPositions(): TabPosition[] {
		return [...this.tabByMnote.values()];
	}

	chordDiagrams(): ChordDiagram[] {
		return [...this.diagramList];
	}

	/* The musical axis: document-scoped parts, each Part -> Measure -> Voice -> Note. */
	parts(): Part[] {
		return [...this.partList];
	}

	/* The layout axis: one System per line, each System -> MeasureBox, top to bottom. */
	systems(): System[] {
		return [...this.systemList];
	}

	/* The element under a score-space point (a fret/notehead beats its measure background). */
	at(point: { x: number; y: number }): Element | null {
		return this.hitTester.hitTest(point);
	}

	/* Every element under the point, topmost first (so [0] === at(point)). */
	allAt(point: { x: number; y: number }): Element[] {
		return this.hitTester.hitTestAll(point);
	}

	/* Every element fully inside the score-space rect (marquee selection), topmost first. */
	within(rect: Rect): Element[] {
		return this.hitTester.hitTestWithin(rect);
	}

	/* Resolves an mdom note to its Note — the seam that keeps timeline identities === hit
	 * identities (SequenceFactory builds onsets against this same map). */
	get noteLookup(): ReadonlyMap<MNote, Note> {
		return this.noteByMnote;
	}
}
