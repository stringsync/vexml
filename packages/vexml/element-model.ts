import type {
	Harmony,
	Barline as MBarline,
	Measure as MMeasure,
	Note as MNote,
	Part as MPart,
} from '@stringsync/mdom';
import type { Rect } from 'webappwiz/geometry';
import type { ChordFrame } from './chord-diagram-glyph';
import type {
	BarlineLocation,
	NoteGlyph,
	RawStave,
} from './geometry-collector';
import type { NoteFacts, NoteKey } from './note';

/*
 * Everything the element index is built from, as data: one entry per element, cross-links as
 * indexes into these lists. A full render derives it from the draw's geometry and the parsed
 * parts (ElementFactory.model), each entry keeping its mdom source; a snapshot carries it with
 * every source null, so both build their elements through one path (ElementFactory.build).
 */
export interface ElementModel {
	bounds: Rect;
	boxes: BoxModel[];
	parts: PartModel[];
	notes: NoteModel[];
	tabs: TabModel[];
	diagrams: DiagramModel[];
	barlines: BarlineModel[];
	/* The pointer tree's notes and frets, in the order they go in: a note's index, or the
	 * bitwise NOT of a tab's (~i). Barlines, per-part measures, then boxes follow them. */
	targets: number[];
}

/* A measure column across every part. */
export interface BoxModel {
	rect: Rect;
	index: number;
	number: string;
	systemIndex: number;
	sources: readonly MMeasure[];
}

export interface PartModel {
	id: string;
	label: string | null;
	measures: MeasureModel[];
	source: MPart | null;
}

/* One part's measure, engraved in the box with the same index. */
export interface MeasureModel {
	rect: Rect;
	index: number;
	number: string;
	voices: VoiceModel[];
	/* Its drawn staves, top to bottom; none until its system is drawn. */
	staves: StaveModel[];
	source: MMeasure | null;
}

export interface BarlineModel {
	rect: Rect;
	location: BarlineLocation;
	/* Its measure: parts[part].measures[measure]. */
	part: number;
	measure: number;
	source: MBarline | null;
}

/* A stave's lines, in score space (see Stave). */
export interface StaveModel {
	staff: number;
	lines: number[];
	left: number;
	right: number;
	noteStartX: number;
}

export interface VoiceModel {
	id: string;
	staff: number;
	/* Its engraved notes, in document order. */
	notes: number[];
}

export interface NoteModel {
	/* What the elements look it up by: its mdom note, or a stand-in from a snapshot. */
	key: NoteKey;
	facts: NoteFacts;
	rect: Rect;
	ink: Rect;
	glyph: NoteGlyph | null;
	/* Its measure: parts[part].measures[measure]. */
	part: number;
	measure: number;
	/* Its chord's engraved notes, itself included. */
	chord: number[];
	source: MNote | null;
}

export interface TabModel {
	note: number;
	rect: Rect;
	string: number;
	fret: number;
	glyph: NoteGlyph | null;
}

export interface DiagramModel {
	rect: Rect;
	frame: ChordFrame;
	title: string | null;
	source: Harmony | null;
}

/* The staves of a column that belong to part `part`. */
export function staveModelsOf(
	staves: readonly RawStave[],
	part: string,
): StaveModel[] {
	return staves
		.filter((s) => s.part === part)
		.map(({ staff, lines, left, right, noteStartX }) => ({
			staff,
			lines,
			left,
			right,
			noteStartX,
		}));
}
