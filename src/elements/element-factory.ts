import type { Note as MNote, Part } from '@stringsync/mdom';
import type { RawGeometry } from '../engraving/score-drawer';
import type { Viewport } from '../host/stage';
import { ChordDiagram } from './chord-diagram';
import type { Decorator, Element } from './element';
import { ElementIndex } from './element-index';
import { DefaultHitTester } from './hit-tester';
import { Measure } from './measure';
import { Note } from './note';
import { QuadTree } from './quadtree';
import { TabPosition } from './tab-position';

/*
 * Turns the draw pass's raw geometry into linked element wrappers and indexes them. Pure given
 * its inputs (no DOM, no rendering), so it's unit-tested directly. A tab note becomes both a Note
 * (its pitch/beats) and a TabPosition (its fret); only the visible glyph is inserted into the
 * tree — the TabPosition for a tab note, the Note for a notation notehead — so a point hits one
 * element, while the other stays reachable via getNote()/getTabPosition().
 *
 * The two maps double as the NoteLookup/TabLookup the wrappers resolve their cross-links through;
 * they're fully populated before any query runs, so the deferred resolution always lands.
 */
export class ElementFactory {
	build(
		geometry: RawGeometry,
		parts: Part[],
		viewport: Viewport,
		decorator: Decorator,
	): ElementIndex {
		const measures = new Map<number, Measure>();
		for (const m of geometry.measures) {
			// Provenance: the measure column at this index spans every part, so its sources are
			// one mdom Measure per part (parts missing that measure contribute nothing).
			const sources = parts.flatMap((p) => p.measures[m.index] ?? []);
			measures.set(
				m.index,
				new Measure(m.rect, viewport, m.number, m.index, sources),
			);
		}

		const noteByMnote = new Map<MNote, Note>();
		const tabByMnote = new Map<MNote, TabPosition>();

		for (const rn of geometry.notes) {
			const measure = measures.get(rn.measureIndex);
			if (!measure) {
				continue;
			}
			noteByMnote.set(
				rn.mnote,
				new Note({
					mnote: rn.mnote,
					rect: rn.rect,
					viewport,
					decorator,
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
					decorator,
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
					decorator,
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
		for (const measure of measures.values()) {
			tree.insert(measure);
		}
		// Chord diagrams are NOT in the pointer tree in v1 (hit-test parity with the old index);
		// tree insertion is a reviewed fast-follow.
		return new ElementIndex(
			new DefaultHitTester(tree),
			noteByMnote,
			measures,
			tabByMnote,
			diagrams,
		);
	}
}
