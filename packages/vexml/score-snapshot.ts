import type { ChordFrame } from './chord-diagram-glyph';
import type { NoteGlyph } from './geometry-collector';
import type { EncodedPaint, PaintStream } from './paint-encoder';
import type { GapInfo } from './score';
import type { SnapshotConfig } from './snapshot-config';
import type { TempoSegment } from './tempo-map';

/** Bumped whenever a snapshot's shape or meaning changes: a snapshot from another version
 * throws SnapshotMismatchError rather than render wrong. */
export const SNAPSHOT_VERSION = 1;

/** Marks a ScoreSnapshot among render's other inputs. */
export const SNAPSHOT_FORMAT = 'vexml-score-snapshot';

/** [x, y, w, h] in score px. */
export type SnapshotRect = [number, number, number, number];

/**
 * A recording of a rendered score (Score.snapshot) that `render` turns back into the same Score
 * without parsing, laying out or drawing: cache it as JSON and render it on a later visit.
 * Plain data, safe to `JSON.stringify` and `structuredClone`; treat everything but `format`
 * and `version` as opaque, since its shape changes with the version.
 */
export interface ScoreSnapshot {
	readonly format: typeof SNAPSHOT_FORMAT;
	readonly version: number;
	/** The config the score was engraved with, as far as it shapes the engraving. */
	readonly config: SnapshotConfig;
	readonly paint: EncodedPaint;
	readonly engraving: SnapshotEngraving | null;
	readonly fold: SnapshotFold | null;
	readonly pages: SnapshotRect[];
	readonly elements: SnapshotElements;
	readonly sequence: SnapshotSequence;
	readonly gaps: GapInfo[];
}

export interface SnapshotEngraving {
	ops: PaintStream;
	width: number;
	height: number;
	/* Exact, in score px: the stage snaps it to its own device pixels. */
	origin: [number, number];
	scale: number;
}

export interface SnapshotFold {
	left: number;
	width: number;
	height: number;
	starts: number[];
	strips: PaintStream[];
}

/* ElementModel with its rects as arrays and no mdom sources. */
export interface SnapshotElements {
	bounds: SnapshotRect;
	boxes: Array<{
		rect: SnapshotRect;
		index: number;
		number: string;
		systemIndex: number;
	}>;
	parts: Array<{
		id: string;
		label: string | null;
		measures: Array<{
			index: number;
			number: string;
			voices: Array<{ id: string; staff: number; notes: number[] }>;
		}>;
	}>;
	/* Fonts the note glyphs name by index. */
	fonts: string[];
	notes: SnapshotNote[];
	tabs: Array<{
		note: number;
		rect: SnapshotRect;
		string: number;
		fret: number;
		glyph: NoteGlyph | null;
	}>;
	diagrams: Array<{
		rect: SnapshotRect;
		frame: ChordFrame;
		title: string | null;
	}>;
	targets: number[];
}

/* A NoteModel packed as a tuple: a score has thousands. `ink` is null where it equals the
 * rect, `chord` null where the note is alone in it, and a glyph's x null where it is the
 * rect's. `flags` is grace | swingExempt << 1 | chordMember << 2. */
export type SnapshotNote = [
	x: number,
	y: number,
	w: number,
	h: number,
	ink: SnapshotRect | null,
	glyph: [text: string, font: number, x: number | null, y: number] | null,
	part: number,
	measure: number,
	pitch: string | null,
	beats: number,
	flags: number,
	chord: number[] | null,
	graces: number[],
	articulations: string[],
];

/* SequenceModel with its rects as arrays. */
export interface SnapshotSequence {
	steps: Array<{
		measureIndex: number;
		startBeat: number;
		endBeat: number;
		x: number;
		glideToX: number;
		systemRect: SnapshotRect;
		active: number[];
	}>;
	segments: TempoSegment[];
	durationBeats: number;
	measureCount: number;
	ties: Array<[number, number]>;
}
