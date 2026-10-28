import { type QuadTree, Rect } from 'webappwiz/geometry';
import { Barline } from './barline';
import { ChordDiagram } from './chord-diagram';
import type { Decorations } from './decoration';
import type { Element } from './element';
import { type StaveModel, staveModelsOf } from './element-model';
import type {
	RawChordDiagram,
	RawMeasure,
	RawNote,
} from './geometry-collector';
import type { MeasureBox } from './measure-box';
import type { Note, NoteKey } from './note';
import { System } from './system';
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
 * built over the geometry the layout forecast (see ProvisionalGeometry), so this gives each its
 * drawn box and glyph and puts it in the pointer tree, which holds nothing of a system until
 * then: a pointer over an undrawn system hits nothing rather than a planned spot. Chord
 * diagrams and barlines exist only once drawn, so they are made here. Until a system is drawn, its elements
 * follow the forecast as the plan advances (see forecast). Built by ElementFactory.buildPlaceable
 * over the same collections the ElementIndex reads.
 */
export class ElementPlacer {
	private readonly placed = new Set<Element>();

	constructor(
		private readonly tree: QuadTree<Element>,
		private readonly noteByKey: ReadonlyMap<NoteKey, Note>,
		private readonly tabByKey: ReadonlyMap<NoteKey, TabPosition>,
		private readonly boxByIndex: ReadonlyMap<number, MeasureBox>,
		// The systems and their box lists, which this adds to and drops from as the forecast moves.
		private readonly systemByIndex: Map<number, System>,
		private readonly boxesOfSystem: Map<number, MeasureBox[]>,
		private readonly diagrams: ChordDiagram[],
		private readonly barlines: Barline[],
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
			for (const measure of box.getMeasures()) {
				const staves = staveModelsOf(m.staves, measure.getPart().getId());
				measure.drawn(staves, rectOfStaves(staves) ?? m.rect);
				if (staves.length > 0) {
					this.insert(measure);
				}
			}
			for (const raw of m.barlines) {
				const measure = box
					.getMeasures()
					.find((candidate) => candidate.getPart().getId() === raw.part);
				if (measure) {
					const barline = new Barline(
						raw.rect,
						this.viewport,
						measure,
						raw.location,
						raw.source,
					);
					this.barlines.push(barline);
					this.insert(barline);
				}
			}
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

	/*
	 * Move the elements of systems not yet drawn to where the plan now forecasts them (see
	 * LayoutPlan.forecast): each column onto the system it is forecast on, its notes to their
	 * share of it, each touched system's rect over its columns, and a System made for each
	 * line the forecast gained or dropped for each it lost. `forecast` holds the undrawn
	 * measures whose place moved, and their notes.
	 */
	forecast(
		forecast: Omit<DrawnSystem, 'chordDiagrams'>,
		systemCount: number,
	): void {
		const touched = new Set<number>();
		for (const m of forecast.measures) {
			const box = this.boxByIndex.get(m.index);
			if (!box || this.placed.has(box)) {
				continue;
			}
			const from = box.getSystem().getIndex();
			if (from !== m.systemIndex) {
				const list = this.boxesOfSystem.get(from);
				list?.splice(list.indexOf(box), 1);
				const { system, boxes } = this.systemAt(m.systemIndex);
				boxes.push(box);
				boxes.sort((a, b) => a.getIndex() - b.getIndex());
				box.rehome(system);
				touched.add(from);
			}
			box.relocate(m.rect);
			touched.add(m.systemIndex);
		}
		for (let s = this.systemByIndex.size - 1; s >= systemCount; s--) {
			if ((this.boxesOfSystem.get(s)?.length ?? 0) === 0) {
				this.systemByIndex.delete(s);
				this.boxesOfSystem.delete(s);
				touched.delete(s);
			}
		}
		for (let s = this.systemByIndex.size; s < systemCount; s++) {
			this.systemAt(s);
		}
		for (const s of touched) {
			const system = this.systemByIndex.get(s);
			if (system) {
				system.relocate(
					this.boxesOfSystem
						.get(s)
						?.reduce<Rect | null>(
							(all, box) => (all ? all.union(box.rect) : box.rect),
							null,
						) ?? new Rect(0, 0, 0, 0),
				);
			}
		}
		const tabOf = new Map<NoteKey, RawNote>();
		for (const rn of forecast.notes) {
			if (rn.tab) {
				tabOf.set(rn.mnote, rn);
			}
		}
		for (const rn of forecast.notes) {
			const note = this.noteByKey.get(rn.mnote);
			if (!note || this.placed.has(note)) {
				continue;
			}
			note.drawn(rn);
			const tabRaw = tabOf.get(rn.mnote);
			const tab = this.tabByKey.get(rn.mnote);
			if (tabRaw && tab) {
				tab.drawn({ rect: tabRaw.rect, glyph: tabRaw.glyph });
			}
		}
	}

	// The system at `index`, made empty if the forecast had none there yet.
	private systemAt(index: number): { system: System; boxes: MeasureBox[] } {
		let system = this.systemByIndex.get(index);
		let boxes = this.boxesOfSystem.get(index);
		if (!system || !boxes) {
			boxes = [];
			system = new System(new Rect(0, 0, 0, 0), this.viewport, index, boxes);
			this.systemByIndex.set(index, system);
			this.boxesOfSystem.set(index, boxes);
		}
		return { system, boxes };
	}

	private insert(element: Element): void {
		if (!this.placed.has(element)) {
			this.placed.add(element);
			this.tree.insert(element, element.rect);
		}
	}
}

function rectOfStaves(staves: readonly StaveModel[]): Rect | null {
	if (staves.length === 0) {
		return null;
	}
	const left = Math.min(...staves.map((stave) => stave.left));
	const right = Math.max(...staves.map((stave) => stave.right));
	const top = Math.min(...staves.map((stave) => stave.lines[0] ?? Infinity));
	const bottom = Math.max(
		...staves.map((stave) => stave.lines[stave.lines.length - 1] ?? -Infinity),
	);
	return new Rect(left, top, right - left, bottom - top);
}
