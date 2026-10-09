import type { Rect } from 'webappwiz/geometry';
import type { ElementModel } from './element-model';
import type { Fold } from './fold';
import type { Note } from './note';
import { PaintContext } from './paint-context';
import { PaintEncoder } from './paint-encoder';
import { PaintList } from './paint-list';
import type { PaintProbe } from './paint-probe';
import type { GapInfo } from './score';
import type { Engraving } from './score-drawer';
import {
	type ScoreSnapshot,
	SNAPSHOT_FORMAT,
	SNAPSHOT_VERSION,
	type SnapshotNote,
	type SnapshotRect,
} from './score-snapshot';
import type { Sequence } from './sequence';
import type { SnapshotConfig } from './snapshot-config';
import type { SnapshotSource } from './snapshot-source';

/* What a full render built, as the recording keeps it for a later snapshot. */
export interface ScoreRecordingParts {
	config: SnapshotConfig;
	engraving: Engraving | null;
	fold: Fold | null;
	pages: readonly Rect[];
	elements: ElementModel;
	/* The score's notes, in the model's note order. */
	notes: readonly Note[];
	sequence: Sequence;
	gaps: readonly GapInfo[];
}

/*
 * What a full render built, kept so the Score can snapshot it: the engraving's ops, the fold, the
 * pages, the element model and the timeline. Encoded only when a snapshot is asked for, so a
 * score nobody snapshots pays nothing. The fold's strips are engraved on demand, so they're
 * recorded here, through the probe the render measured text with.
 */
export class ScoreRecording implements SnapshotSource {
	readonly hasDocument = true;

	constructor(
		private readonly parts: ScoreRecordingParts,
		private readonly probe: PaintProbe,
	) {}

	snapshot(): ScoreSnapshot {
		const { config, engraving, fold, pages, elements, notes, sequence, gaps } =
			this.parts;
		const encoder = new PaintEncoder();
		const engraved = engraving && {
			ops: encoder.encode(engraving.ops),
			width: engraving.width,
			height: engraving.height,
			origin: [engraving.origin.x, engraving.origin.y] as [number, number],
			scale: engraving.scale,
		};
		const folded = fold && {
			left: fold.left,
			width: fold.width,
			height: fold.height,
			starts: [...fold.starts],
			strips: fold.starts.map((_, i) => {
				const list = new PaintList();
				fold.paint(
					new PaintContext(
						list,
						this.probe,
						null,
					) as unknown as CanvasRenderingContext2D,
					i,
				);
				return encoder.encode(list.ops);
			}),
		};
		const model = sequence.model(new Map(notes.map((note, i) => [note, i])));
		const noteIndex = new Map(elements.notes.map((note, i) => [note.key, i]));
		const fonts: string[] = [];
		const fontIndex = (font: string) => {
			const known = fonts.indexOf(font);
			return known < 0 ? fonts.push(font) - 1 : known;
		};
		return {
			format: SNAPSHOT_FORMAT,
			version: SNAPSHOT_VERSION,
			config: structuredClone(config),
			paint: encoder.tables(),
			engraving: engraved,
			fold: folded,
			pages: pages.map(rect),
			elements: {
				bounds: rect(elements.bounds),
				boxes: elements.boxes.map((box) => ({
					rect: rect(box.rect),
					index: box.index,
					number: box.number,
					systemIndex: box.systemIndex,
				})),
				parts: elements.parts.map((part) => ({
					id: part.id,
					label: part.label,
					measures: part.measures.map((measure) => ({
						index: measure.index,
						number: measure.number,
						voices: measure.voices.map((voice) => ({
							id: voice.id,
							staff: voice.staff,
							notes: [...voice.notes],
						})),
					})),
				})),
				fonts,
				notes: elements.notes.map((note, i): SnapshotNote => {
					const { glyph, facts } = note;
					return [
						note.rect.x,
						note.rect.y,
						note.rect.w,
						note.rect.h,
						sameRect(note.ink, note.rect) ? null : rect(note.ink),
						glyph && [
							glyph.text,
							fontIndex(glyph.font),
							glyph.x === note.rect.x ? null : glyph.x,
							glyph.y,
						],
						note.part,
						note.measure,
						facts.pitch,
						facts.beats,
						(facts.grace ? 1 : 0) |
							(facts.swingExempt ? 2 : 0) |
							(facts.chordMember ? 4 : 0),
						note.chord.length === 1 && note.chord[0] === i
							? null
							: [...note.chord],
						facts.graces.flatMap((key) => noteIndex.get(key) ?? []),
						[...facts.articulations],
					];
				}),
				tabs: elements.tabs.map((tab) => ({
					note: tab.note,
					rect: rect(tab.rect),
					string: tab.string,
					fret: tab.fret,
					glyph: tab.glyph && { ...tab.glyph },
				})),
				diagrams: elements.diagrams.map((diagram) => ({
					rect: rect(diagram.rect),
					frame: structuredClone(diagram.frame),
					title: diagram.title,
				})),
				targets: [...elements.targets],
			},
			sequence: {
				steps: model.steps.map((step) => ({
					measureIndex: step.measureIndex,
					startBeat: step.startBeat,
					endBeat: step.endBeat,
					x: step.x,
					glideToX: step.glideToX,
					systemRect: rect(step.systemRect),
					active: step.active,
				})),
				segments: model.segments.map((segment) => ({ ...segment })),
				durationBeats: model.durationBeats,
				measureCount: model.measureCount,
				ties: model.ties,
			},
			gaps: gaps.map((gap) => ({ ...gap })),
		};
	}
}

function rect(r: Rect): SnapshotRect {
	return [r.x, r.y, r.w, r.h];
}

function sameRect(a: Rect, b: Rect): boolean {
	return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
