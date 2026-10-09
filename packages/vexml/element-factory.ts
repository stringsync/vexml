import type {
	Measure as MMeasure,
	Note as MNote,
	Part as MPart,
} from '@stringsync/mdom';
import { QuadTree, Rect } from 'webappwiz/geometry';
import { ChordDiagram } from './chord-diagram';
import type { Decorations } from './decoration';
import { DefaultHitTester } from './default-hit-tester';
import type { Element } from './element';
import { ElementIndex } from './element-index';
import type {
	ElementModel,
	MeasureModel,
	NoteModel,
	PartModel,
	TabModel,
} from './element-model';
import { Measure } from './measure';
import { MeasureBox } from './measure-box';
import { MNoteFacts } from './mnote-facts';
import { Note, type NoteKey } from './note';
import { Part } from './part';
import type { RawGeometry } from './score-drawer';
import { System } from './system';
import { TabPosition } from './tab-position';
import type { Viewport } from './viewport';
import { Voice } from './voice';

/*
 * Turns the draw pass's raw geometry into linked element wrappers and indexes them. Pure given
 * its inputs (no DOM, no rendering), so it's unit-tested directly. It works in two steps: model()
 * reads the geometry and the parsed parts into an ElementModel, and build() makes the elements
 * from a model, which is also all a snapshot carries, so a snapshot's elements come out of the
 * same code as a full render's.
 *
 * Two axes come out of here, joined at the measure. The layout axis (System -> MeasureBox) is
 * built from the geometry: one box per measure column, grouped into systems whose rects union
 * their columns. The musical axis (Part -> Measure -> Voice -> Note) mirrors mdom: one Measure
 * per (part, column). Cross-links that would be circular at construction resolve through shared
 * collections filled before any query runs: a System's box list, a box's per-part Measure list,
 * and the note maps below.
 *
 * A tab note becomes both a Note (its pitch/beats) and a TabPosition (its fret); only the visible
 * glyph is inserted into the tree: the TabPosition for a tab note, the Note for a notation
 * notehead, so a point hits one element, while the other stays reachable via
 * getNote()/getTabPosition(). The two note maps double as the NoteLookup/TabLookup the wrappers
 * (and Voices) resolve through.
 */
export class ElementFactory {
	/* Read the draw's geometry and the parsed parts into the plain model build() takes. */
	model(geometry: RawGeometry, parts: MPart[]): ElementModel {
		// One box per measure column; a repeated index keeps its first place and its last rect,
		// as the boxes are keyed by index.
		const boxByIndex = new Map<number, ElementModel['boxes'][number]>();
		for (const m of geometry.measures) {
			boxByIndex.set(m.index, {
				rect: m.rect,
				index: m.index,
				number: m.number,
				systemIndex: m.systemIndex,
				// Provenance: the measure column at this index spans every part, so its sources are
				// one mdom Measure per part (parts missing that measure contribute nothing).
				sources: parts.flatMap((p) => p.measures[m.index] ?? []),
			});
		}
		const boxes = [...boxByIndex.values()];

		// Musical axis: one Measure per (part, rendered column). A measure the draw pass emitted no
		// column for (nothing rendered at that index) gets no Measure.
		const where = new Map<MMeasure, { part: number; measure: number }>();
		const partModels: PartModel[] = parts.map((mpart, part) => {
			const measures: MeasureModel[] = [];
			for (const box of boxes) {
				const mmeasure = mpart.measures[box.index];
				if (!mmeasure) {
					continue;
				}
				where.set(mmeasure, { part, measure: measures.length });
				measures.push({
					index: mmeasure.index,
					number: mmeasure.number,
					voices: [],
					source: mmeasure,
				});
			}
			return { id: mpart.id, label: mpart.label, measures, source: mpart };
		});

		// A note drawn twice (on a notation stave and a tab stave) is one Note: it keeps its first
		// place and takes its last drawing.
		const drawn = new Map<MNote, RawGeometry['notes'][number]>();
		for (const rn of geometry.notes) {
			// No per-part Measure means the note's column was never rendered, so the note has no
			// place in the index either.
			if (where.has(rn.mnote.measure)) {
				drawn.set(rn.mnote, rn);
			}
		}
		const indexOf = new Map<MNote, number>();
		for (const mnote of drawn.keys()) {
			indexOf.set(mnote, indexOf.size);
		}
		const indexesOf = (mnotes: readonly MNote[]) =>
			mnotes.flatMap((mnote) => indexOf.get(mnote) ?? []);
		const notes: NoteModel[] = [...drawn.values()].map((rn) => {
			const at = where.get(rn.mnote.measure) ?? { part: 0, measure: 0 };
			return {
				key: rn.mnote,
				facts: new MNoteFacts(rn.mnote, rn.chord),
				rect: rn.rect,
				ink: rn.ink,
				glyph: rn.glyph,
				part: at.part,
				measure: at.measure,
				chord: indexesOf(rn.chord),
				source: rn.mnote,
			};
		});
		for (const [part, mpart] of parts.entries()) {
			for (const mmeasure of mpart.measures) {
				const at = where.get(mmeasure);
				const measure = at && partModels[part]?.measures[at.measure];
				if (measure) {
					measure.voices = mmeasure.voices.map((v) => ({
						id: v.id,
						staff: Number(v.staff),
						notes: indexesOf(v.notes),
					}));
				}
			}
		}

		// A fret takes the last drawing of its note that has one.
		const tabByNote = new Map<number, TabModel>();
		for (const rn of geometry.notes) {
			const note = indexOf.get(rn.mnote);
			if (rn.tab && note !== undefined) {
				tabByNote.set(note, {
					note,
					rect: rn.rect,
					string: rn.tab.string,
					fret: rn.tab.fret,
					glyph: rn.glyph,
				});
			}
		}
		const tabs = [...tabByNote.values()];
		const tabIndexOf = new Map(tabs.map((tab, i) => [tab.note, i]));

		const targets: number[] = [];
		for (const rn of geometry.notes) {
			// Grace notes are reachable as Note elements (playback sounds/colors them) but stay out
			// of the pointer tree, so a small grace head never steals hover/click from its main note.
			const note = indexOf.get(rn.mnote);
			if (rn.mnote.isGrace || note === undefined) {
				continue;
			}
			const tab = tabIndexOf.get(note);
			targets.push(tab === undefined ? note : ~tab);
		}

		return {
			bounds: geometry.bounds,
			boxes,
			parts: partModels,
			notes,
			tabs,
			diagrams: geometry.chordDiagrams.map((d) => ({
				rect: d.rect,
				frame: d.frame,
				title: d.title,
				source: d.harmonySource,
			})),
			targets,
		};
	}

	/* Make the linked, indexed elements a model describes. */
	build(
		model: ElementModel,
		viewport: Viewport,
		decorations: Decorations,
	): ElementIndex {
		// Layout axis: one System per line, its rect the union of the line's measure columns.
		const rawsBySystem = new Map<number, Rect[]>();
		for (const m of model.boxes) {
			const rects = rawsBySystem.get(m.systemIndex) ?? [];
			rects.push(m.rect);
			rawsBySystem.set(m.systemIndex, rects);
		}
		const systems = new Map<number, System>();
		const boxesOfSystem = new Map<number, MeasureBox[]>();
		for (const [systemIndex, rects] of rawsBySystem) {
			const x = Math.min(...rects.map((r) => r.x));
			const y = Math.min(...rects.map((r) => r.y));
			const right = Math.max(...rects.map((r) => r.right));
			const bottom = Math.max(...rects.map((r) => r.bottom));
			const boxes: MeasureBox[] = [];
			boxesOfSystem.set(systemIndex, boxes);
			systems.set(
				systemIndex,
				new System(
					new Rect(x, y, right - x, bottom - y),
					viewport,
					systemIndex,
					boxes,
				),
			);
		}

		const boxes = new Map<number, MeasureBox>();
		const measuresOfBox = new Map<number, Measure[]>();
		for (const m of model.boxes) {
			const system = systems.get(m.systemIndex);
			if (!system) {
				continue; // unreachable: every systemIndex was grouped above
			}
			const measureList: Measure[] = [];
			measuresOfBox.set(m.index, measureList);
			const box = new MeasureBox(
				m.rect,
				viewport,
				m.number,
				m.index,
				m.sources,
				system,
				measureList,
			);
			boxes.set(m.index, box);
			boxesOfSystem.get(m.systemIndex)?.push(box);
		}

		const keys: NoteKey[] = model.notes.map((n) => n.key);
		const keysOf = (indexes: readonly number[]) =>
			indexes.flatMap((i) => keys[i] ?? []);
		const noteByKey = new Map<NoteKey, Note>();
		const tabByKey = new Map<NoteKey, TabPosition>();

		// Musical axis: Voices resolve notes through noteByKey (filled below, before any query).
		const partList: Part[] = [];
		const measuresOfPart: Measure[][] = [];
		for (const pm of model.parts) {
			const measureList: Measure[] = [];
			const part = new Part(pm.source, pm.id, pm.label, measureList);
			partList.push(part);
			measuresOfPart.push(measureList);
			for (const mm of pm.measures) {
				const box = boxes.get(mm.index);
				if (!box) {
					continue; // unreachable: a part's measure is one per box
				}
				const voices = mm.voices.map(
					(v) => new Voice(v.id, v.staff, keysOf(v.notes), noteByKey),
				);
				const measure = new Measure(
					mm.source,
					mm.number,
					mm.index,
					part,
					box,
					voices,
				);
				measureList.push(measure);
				measuresOfBox.get(box.getIndex())?.push(measure);
			}
		}

		for (const [i, nm] of model.notes.entries()) {
			const measure = measuresOfPart[nm.part]?.[nm.measure];
			const key = keys[i];
			if (!measure || !key) {
				continue; // unreachable: the model places every note in a measure
			}
			noteByKey.set(
				key,
				new Note({
					key,
					source: nm.source,
					facts: nm.facts,
					rect: nm.rect,
					ink: nm.ink,
					viewport,
					decorations,
					measure,
					chord: keysOf(nm.chord),
					notes: noteByKey,
					tabs: tabByKey,
					glyph: nm.glyph,
				}),
			);
		}

		const tabList: TabPosition[] = [];
		for (const tm of model.tabs) {
			const key = keys[tm.note];
			const note = key && noteByKey.get(key);
			if (!key || !note) {
				continue;
			}
			const tab = new TabPosition(tm.rect, viewport, {
				string: tm.string,
				fret: tm.fret,
				note,
				decorations,
				glyph: tm.glyph,
			});
			tabByKey.set(key, tab);
			tabList.push(tab);
		}

		const diagrams = model.diagrams.map(
			(d) =>
				new ChordDiagram(d.rect, viewport, {
					source: d.source,
					frame: d.frame,
					title: d.title,
					decorations,
				}),
		);

		const tree = new QuadTree<Element>(model.bounds);
		const notes = [...noteByKey.values()];
		for (const target of model.targets) {
			const element = target < 0 ? tabList[~target] : notes[target];
			if (element) {
				tree.insert(element, element.rect);
			}
		}
		for (const box of boxes.values()) {
			tree.insert(box, box.rect);
		}
		// Systems stay out of the pointer tree: a system-wide target would sit under every
		// staff-space point and add noise to allAt/within; boxes already cover the hit story.
		// Chord diagrams are NOT in the pointer tree in v1 (hit-test parity with the old index);
		// tree insertion is a reviewed fast-follow.
		return new ElementIndex(
			new DefaultHitTester(tree),
			noteByKey,
			boxes,
			tabByKey,
			diagrams,
			partList,
			[...systems.values()],
		);
	}
}
