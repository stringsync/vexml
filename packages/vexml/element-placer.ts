import type { QuadTree, Rect } from 'webappwiz/geometry';
import { ChordDiagram } from './chord-diagram';
import type { Decorations } from './decoration';
import type { Element } from './element';
import type {
	RawChordDiagram,
	RawMeasure,
	RawNote,
} from './geometry-collector';
import type { MeasureBox } from './measure-box';
import type { Note, NoteKey } from './note';
import type { System } from './system';
import type { TabPosition } from './tab-position';
import type { Viewport } from './viewport';

/* What one drawn system contributes to the hit-index geometry, in score space. */
export interface DrawnSystem {
	measures: readonly RawMeasure[];
	notes: readonly RawNote[];
	chordDiagrams: readonly RawChordDiagram[];
}

/*
 * Moves the elements of a progressive render into place as each system is drawn: they were
 * built over the geometry the layout planned (see ProvisionalGeometry), so this gives each its
 * drawn box and glyph and puts it in the pointer tree, which holds nothing of a system until
 * then: a pointer over an undrawn system hits nothing rather than a planned spot. Chord
 * diagrams exist only once drawn, so they are made here. Built by ElementFactory.buildPlaceable
 * over the same collections the ElementIndex reads.
 */
export class ElementPlacer {
	private readonly placed = new Set<Element>();

	constructor(
		private readonly tree: QuadTree<Element>,
		private readonly noteByKey: ReadonlyMap<NoteKey, Note>,
		private readonly tabByKey: ReadonlyMap<NoteKey, TabPosition>,
		private readonly boxByIndex: ReadonlyMap<number, MeasureBox>,
		private readonly systemByIndex: ReadonlyMap<number, System>,
		private readonly diagrams: ChordDiagram[],
		private readonly viewport: Viewport,
		private readonly decorations: Decorations,
	) {}

	/* Put `system`'s elements where its draw put them, once. */
	place(system: number, drawn: DrawnSystem): void {
		let bounds: Rect | null = null;
		for (const m of drawn.measures) {
			const box = this.boxByIndex.get(m.index);
			if (!box) {
				continue;
			}
			box.relocate(m.rect);
			bounds = bounds ? bounds.union(m.rect) : m.rect;
			this.insert(box);
		}
		if (bounds) {
			this.systemByIndex.get(system)?.relocate(bounds);
		}
		// A note drawn twice (on a notation stave and a tab stave) takes its last drawing, and
		// its fret is what the pointer finds (see ElementFactory.model).
		const lastOf = new Map<NoteKey, RawNote>();
		const tabOf = new Map<NoteKey, RawNote>();
		for (const rn of drawn.notes) {
			lastOf.set(rn.mnote, rn);
			if (rn.tab) {
				tabOf.set(rn.mnote, rn);
			}
		}
		for (const [key, rn] of lastOf) {
			const note = this.noteByKey.get(key);
			if (!note) {
				continue;
			}
			note.drawn(rn);
			const tabRaw = tabOf.get(key);
			const tab = this.tabByKey.get(key);
			if (tabRaw && tab) {
				tab.drawn({ rect: tabRaw.rect, glyph: tabRaw.glyph });
			}
			// Grace notes stay out of the pointer tree, so a small grace head never steals
			// hover/click from its main note.
			if (!rn.mnote.isGrace) {
				this.insert(tab ?? note);
			}
		}
		for (const d of drawn.chordDiagrams) {
			this.diagrams.push(
				new ChordDiagram(d.rect, this.viewport, {
					source: d.harmonySource,
					frame: d.frame,
					title: d.title,
					decorations: this.decorations,
				}),
			);
		}
	}

	private insert(element: Element): void {
		if (!this.placed.has(element)) {
			this.placed.add(element);
			this.tree.insert(element, element.rect);
		}
	}
}
