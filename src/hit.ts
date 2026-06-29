import type { Note as MNote } from '@stringsync/mdom';
import { Rect } from './geometry';
import { QuadTree } from './quadtree';
import {
	type Decorator,
	Measure,
	Note,
	type NoteGlyph,
	type PointerTarget,
	TabPosition,
	type Viewport,
} from './targets';

/*
 * The hit index: a spatial map from a point in score space to the target under it. Built once
 * per render from the geometry the draw pass emits, then queried on every pointer event. The
 * QuadTree (the renderer's collision broad-phase) doubles as the index — targets are Bounded,
 * so they're valid items.
 */

/* A notehead or fret the draw pass laid out, in score space. `tab` is set when this is a tab
 * fret rendering (the note's string/fret, plus the fret as drawn and its font so a decoration can
 * recolor the digit); null for a notation notehead. `chord` lists every mdom note sharing this
 * note's onset so chordmates resolve. mnote stays internal. */
export interface RawNote {
	mnote: MNote;
	rect: Rect;
	chord: MNote[];
	measureIndex: number;
	tab: { string: number; fret: number; text: string; font: string } | null;
	/* The engraved notehead glyph (for recoloring); null for a tab fret or a rest. */
	glyph: NoteGlyph | null;
}

export interface RawMeasure {
	rect: Rect;
	index: number;
	/* The MusicXML measure number (a string — handles pickups, "X1" etc.). */
	number: string;
}

/* Everything the draw pass emits for the index, in score space (crop already applied). */
export interface RawGeometry {
	bounds: Rect;
	notes: RawNote[];
	measures: RawMeasure[];
}

export interface HitTester {
	hitTest(point: { x: number; y: number }): PointerTarget | null;
}

export class QuadTreeHitTester implements HitTester {
	constructor(private readonly tree: QuadTree<PointerTarget>) {}

	/*
	 * The target under `point`: a foreground glyph (note / fret) beats the measure background it
	 * sits on, and among same-tier overlaps the tighter (smaller-area) box wins — so a notehead
	 * is picked over the measure, and the nearer notehead of a chord over its neighbor.
	 */
	hitTest(point: { x: number; y: number }): PointerTarget | null {
		const probe = new Rect(point.x, point.y, 1, 1);
		let best: PointerTarget | null = null;
		let bestArea = Number.POSITIVE_INFINITY;
		let bestForeground = false;
		for (const target of this.tree.query(probe)) {
			const foreground = target.type !== 'measure';
			const area = target.rect.w * target.rect.h;
			const better =
				best === null ||
				(foreground && !bestForeground) ||
				(foreground === bestForeground && area < bestArea);
			if (better) {
				best = target;
				bestArea = area;
				bestForeground = foreground;
			}
		}
		return best;
	}
}

/*
 * Turn the draw pass's raw geometry into linked target wrappers and index them. Pure given its
 * inputs (no DOM, no rendering), so it's unit-tested directly. A tab note becomes both a Note
 * (its pitch/beats) and a TabPosition (its fret); only the visible glyph is inserted into the
 * tree — the TabPosition for a tab note, the Note for a notation notehead — so a point hits one
 * target, while the other stays reachable via getNote()/getTabPosition().
 *
 * The two maps double as the NoteLookup/TabLookup the wrappers resolve their cross-links through;
 * they're fully populated before any query runs, so the deferred resolution always lands.
 */
export function buildTargets(
	geometry: RawGeometry,
	viewport: Viewport,
	decorator: Decorator,
): HitTester {
	const measures = new Map<number, Measure>();
	for (const m of geometry.measures) {
		measures.set(m.index, new Measure(m.rect, viewport, m.number));
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
				text: rn.tab.text,
				font: rn.tab.font,
			}),
		);
	}

	const tree = new QuadTree<PointerTarget>(geometry.bounds);
	for (const rn of geometry.notes) {
		const target = tabByMnote.get(rn.mnote) ?? noteByMnote.get(rn.mnote);
		if (target) {
			tree.insert(target);
		}
	}
	for (const measure of measures.values()) {
		tree.insert(measure);
	}
	return new QuadTreeHitTester(tree);
}
