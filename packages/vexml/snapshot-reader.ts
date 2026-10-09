import { MDocument } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import type { Config } from './config';
import type { ElementModel } from './element-model';
import type { Fold } from './fold';
import { PaintDecoder } from './paint-decoder';
import { RecordedFold } from './recorded-fold';
import type { Engraving } from './score-drawer';
import {
	type ScoreSnapshot,
	SNAPSHOT_FORMAT,
	SNAPSHOT_VERSION,
	type SnapshotRect,
} from './score-snapshot';
import type { SequenceModel } from './sequence';
import { snapshotConfig } from './snapshot-config';
import { SnapshotMismatchError } from './snapshot-mismatch-error';

/* A snapshot decoded into what the renderer builds a Score from. */
export interface ReadSnapshot {
	engraving: Engraving | null;
	fold: Fold | null;
	pages: Rect[];
	elements: ElementModel;
	sequence: SequenceModel;
}

/*
 * Checks a snapshot against the config a caller renders it with, and decodes it. check() runs
 * before render touches the container, so a caller who catches SnapshotMismatchError can render
 * the MusicXML into the same container instead.
 */
export class SnapshotReader {
	constructor(private readonly config: Config) {}

	/* Whether `input` is meant as a snapshot: anything render takes that isn't a document. */
	static isSnapshot(input: unknown): input is ScoreSnapshot {
		return (
			typeof input === 'object' &&
			input !== null &&
			!(typeof Blob !== 'undefined' && input instanceof Blob) &&
			!(input instanceof MDocument)
		);
	}

	check(snapshot: ScoreSnapshot): void {
		if (snapshot.format !== SNAPSHOT_FORMAT) {
			throw new SnapshotMismatchError(
				'format',
				'render: the input is not a vexml score snapshot',
			);
		}
		if (snapshot.version !== SNAPSHOT_VERSION) {
			throw new SnapshotMismatchError(
				'version',
				`render: the snapshot is version ${snapshot.version}, this vexml reads ${SNAPSHOT_VERSION}`,
			);
		}
		const want = JSON.stringify(snapshotConfig(this.config));
		if (JSON.stringify(snapshot.config) !== want) {
			throw new SnapshotMismatchError(
				'config',
				'render: the snapshot was engraved with a different config',
			);
		}
	}

	read(snapshot: ScoreSnapshot): ReadSnapshot {
		const decoder = new PaintDecoder(snapshot.paint);
		const { engraving, fold, elements, sequence } = snapshot;
		// A stand-in per note for the elements to look it up by: a snapshot has no mdom notes.
		const keys = elements.notes.map(() => ({}));
		return {
			engraving: engraving && {
				ops: decoder.decode(engraving.ops),
				width: engraving.width,
				height: engraving.height,
				origin: { x: engraving.origin[0], y: engraving.origin[1] },
				scale: engraving.scale,
			},
			fold:
				fold &&
				new RecordedFold(
					fold.left,
					fold.width,
					fold.height,
					fold.starts,
					fold.strips.map((strip) => decoder.decode(strip)),
				),
			pages: snapshot.pages.map(rect),
			elements: {
				bounds: rect(elements.bounds),
				boxes: elements.boxes.map((box) => ({
					...box,
					rect: rect(box.rect),
					sources: [],
				})),
				parts: elements.parts.map((part) => ({
					...part,
					source: null,
					measures: part.measures.map((measure) => ({
						...measure,
						source: null,
					})),
				})),
				notes: elements.notes.map((note, i) => {
					const [x, y, w, h, ink, glyph, part, measure, pitch, beats, flags] =
						note;
					const box = new Rect(x, y, w, h);
					return {
						key: keys[i] ?? {},
						facts: {
							pitch,
							beats,
							articulations: note[13],
							grace: (flags & 1) !== 0,
							swingExempt: (flags & 2) !== 0,
							chordMember: (flags & 4) !== 0,
							graces: note[12].flatMap((g) => keys[g] ?? []),
						},
						rect: box,
						ink: ink ? rect(ink) : box,
						glyph: glyph && {
							text: glyph[0],
							font: elements.fonts[glyph[1]] ?? '',
							x: glyph[2] ?? x,
							y: glyph[3],
						},
						part,
						measure,
						chord: note[11] ?? [i],
						source: null,
					};
				}),
				tabs: elements.tabs.map((tab) => ({ ...tab, rect: rect(tab.rect) })),
				diagrams: elements.diagrams.map((diagram) => ({
					...diagram,
					rect: rect(diagram.rect),
					source: null,
				})),
				targets: elements.targets,
			},
			sequence: {
				...sequence,
				steps: sequence.steps.map((step) => ({
					...step,
					systemRect: rect(step.systemRect),
				})),
			},
		};
	}
}

function rect([x, y, w, h]: SnapshotRect): Rect {
	return new Rect(x, y, w, h);
}
