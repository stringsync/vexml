import type { MElement, Note as MNote, Part as MPart } from '@stringsync/mdom';
import type { RawGeometry } from '../engraving/score-drawer';
import { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import { ChordDiagram } from './chord-diagram';
import type { Decorations, Element } from './element';
import { ElementIndex } from './element-index';
import { DefaultHitTester } from './hit-tester';
import { Measure } from './measure';
import { MeasureBox } from './measure-box';
import { Note } from './note';
import { Part } from './part';
import { QuadTree } from './quadtree';
import { System } from './system';
import { TabPosition } from './tab-position';
import { Voice } from './voice';

/*
 * Turns the draw pass's raw geometry into linked element wrappers and indexes them. Pure given
 * its inputs (no DOM, no rendering), so it's unit-tested directly.
 *
 * Two axes come out of here, joined at the measure. The layout axis (System -> MeasureBox) is
 * built from the geometry: one box per measure column, grouped into systems whose rects union
 * their columns. The musical axis (Part -> Measure -> Voice -> Note) mirrors mdom: one Measure
 * per (part, column). Cross-links that would be circular at construction resolve through shared
 * collections filled before any query runs — a System's box list, a box's per-part Measure list,
 * and the note maps below.
 *
 * A tab note becomes both a Note (its pitch/beats) and a TabPosition (its fret); only the visible
 * glyph is inserted into the tree — the TabPosition for a tab note, the Note for a notation
 * notehead — so a point hits one element, while the other stays reachable via
 * getNote()/getTabPosition(). The two note maps double as the NoteLookup/TabLookup the wrappers
 * (and Voices) resolve through.
 */
export class ElementFactory {
	build(
		geometry: RawGeometry,
		parts: MPart[],
		viewport: Viewport,
		decorations: Decorations,
	): ElementIndex {
		// Layout axis: one System per line, its rect the union of the line's measure columns.
		const rawsBySystem = new Map<number, Rect[]>();
		for (const m of geometry.measures) {
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
		for (const m of geometry.measures) {
			const system = systems.get(m.systemIndex);
			if (!system) {
				continue; // unreachable: every systemIndex was grouped above
			}
			// Provenance: the measure column at this index spans every part, so its sources are
			// one mdom Measure per part (parts missing that measure contribute nothing).
			const sources = parts.flatMap((p) => p.measures[m.index] ?? []);
			const measureList: Measure[] = [];
			measuresOfBox.set(m.index, measureList);
			const box = new MeasureBox(
				m.rect,
				viewport,
				m.number,
				m.index,
				sources,
				system,
				measureList,
			);
			boxes.set(m.index, box);
			boxesOfSystem.get(m.systemIndex)?.push(box);
		}

		const noteByMnote = new Map<MNote, Note>();
		const tabByMnote = new Map<MNote, TabPosition>();

		// Musical axis: one Measure per (part, rendered column), its Voices resolving notes
		// through noteByMnote (filled below, before any query). A measure the draw pass emitted
		// no column for (nothing rendered at that index) gets no Measure.
		const partList: Part[] = [];
		const measureByMMeasure = new Map<MElement, Measure>();
		for (const mpart of parts) {
			const measureList: Measure[] = [];
			const part = new Part(mpart, measureList);
			partList.push(part);
			for (const box of boxes.values()) {
				const mmeasure = mpart.measures[box.getIndex()];
				if (!mmeasure) {
					continue;
				}
				const voices = mmeasure.voices.map(
					(v) => new Voice(v.id, Number(v.staff), v.notes, noteByMnote),
				);
				const measure = new Measure(mmeasure, part, box, voices);
				measureList.push(measure);
				measuresOfBox.get(box.getIndex())?.push(measure);
				measureByMMeasure.set(mmeasure, measure);
			}
		}

		for (const rn of geometry.notes) {
			// A note's mdom parent is its measure; no per-part Measure means its column was never
			// rendered, so the note has no place in the index either.
			const measure = rn.mnote.parent
				? measureByMMeasure.get(rn.mnote.parent)
				: undefined;
			if (!measure) {
				continue;
			}
			noteByMnote.set(
				rn.mnote,
				new Note({
					mnote: rn.mnote,
					rect: rn.rect,
					viewport,
					decorations,
					measure,
					chord: rn.chord,
					notes: noteByMnote,
					tabs: tabByMnote,
					glyph: rn.glyph,
				}),
			);
		}

		for (const rn of geometry.notes) {
			const note = noteByMnote.get(rn.mnote);
			if (!rn.tab || !note) {
				continue;
			}
			tabByMnote.set(
				rn.mnote,
				new TabPosition(rn.rect, viewport, {
					string: rn.tab.string,
					fret: rn.tab.fret,
					note,
					decorations,
					glyph: rn.glyph,
				}),
			);
		}

		const diagrams = geometry.chordDiagrams.map(
			(d) =>
				new ChordDiagram(d.rect, viewport, {
					source: d.harmonySource,
					frame: d.frame,
					title: d.title,
					decorations,
				}),
		);

		const tree = new QuadTree<Element>(geometry.bounds);
		for (const rn of geometry.notes) {
			// Grace notes are reachable as Note elements (playback sounds/colors them) but stay out
			// of the pointer tree, so a small grace head never steals hover/click from its main note.
			if (rn.mnote.isGrace) {
				continue;
			}
			const target = tabByMnote.get(rn.mnote) ?? noteByMnote.get(rn.mnote);
			if (target) {
				tree.insert(target);
			}
		}
		for (const box of boxes.values()) {
			tree.insert(box);
		}
		// Systems stay out of the pointer tree: a system-wide target would sit under every
		// staff-space point and add noise to allAt/within; boxes already cover the hit story.
		// Chord diagrams are NOT in the pointer tree in v1 (hit-test parity with the old index);
		// tree insertion is a reviewed fast-follow.
		return new ElementIndex(
			new DefaultHitTester(tree),
			noteByMnote,
			boxes,
			tabByMnote,
			diagrams,
			partList,
			[...systems.values()],
		);
	}
}
