import { describe, expect, it } from 'bun:test';
import { type Config, DEFAULT_CONFIG } from './config';
import {
	type ScoreSnapshot,
	SNAPSHOT_FORMAT,
	SNAPSHOT_VERSION,
} from './score-snapshot';
import { snapshotConfig } from './snapshot-config';
import { SnapshotMismatchError } from './snapshot-mismatch-error';
import { SnapshotReader } from './snapshot-reader';

describe('SnapshotReader', () => {
	it('accepts a snapshot engraved with the same config', () => {
		expect(() =>
			new SnapshotReader(DEFAULT_CONFIG).check(snapshotOf(DEFAULT_CONFIG)),
		).not.toThrow();
	});

	it('ignores what only sizes the stage', () => {
		const sized: Config = {
			...DEFAULT_CONFIG,
			width: 390,
			maxHeight: 600,
			pixelRatio: 3,
		};

		expect(() =>
			new SnapshotReader(sized).check(snapshotOf(DEFAULT_CONFIG)),
		).not.toThrow();
	});

	it('ignores the order a caller wrote the layout in', () => {
		const reordered: Config = {
			...DEFAULT_CONFIG,
			layout: {
				overflow: 'wrap',
				honorSystemBreaks: true,
				referenceWidth: 720,
				type: 'standard',
			},
		};

		expect(() =>
			new SnapshotReader(reordered).check(
				snapshotOf({
					...DEFAULT_CONFIG,
					layout: {
						type: 'standard',
						referenceWidth: 720,
						honorSystemBreaks: true,
						overflow: 'wrap',
					},
				}),
			),
		).not.toThrow();
	});

	it('ignores gaps, which the snapshot brings', () => {
		const gapped: Config = {
			...DEFAULT_CONFIG,
			gaps: [{ beforeBarIndex: 0, durationMs: 1500, label: 'Lead-in' }],
		};

		expect(() =>
			new SnapshotReader(DEFAULT_CONFIG).check(snapshotOf(gapped)),
		).not.toThrow();
		expect(() =>
			new SnapshotReader(gapped).check(snapshotOf(DEFAULT_CONFIG)),
		).not.toThrow();
		expect(reasonOf(snapshotOf(gapped), { noteSpacing: 50 })).toBe('config');
	});

	it('refuses another engraving config', () => {
		expect(reasonOf(snapshotOf(DEFAULT_CONFIG), { noteSpacing: 50 })).toBe(
			'config',
		);
		expect(
			reasonOf(snapshotOf(DEFAULT_CONFIG), {
				fonts: { notation: { family: 'Bravura', color: '#ff0000' } },
			}),
		).toBe('config');
		expect(
			reasonOf(snapshotOf(DEFAULT_CONFIG), { backgroundColor: '#000000' }),
		).toBe('config');
	});

	it('refuses another version', () => {
		expect(
			reasonOf({
				...snapshotOf(DEFAULT_CONFIG),
				version: SNAPSHOT_VERSION + 1,
			}),
		).toBe('version');
	});

	it('refuses what is not a snapshot', () => {
		expect(reasonOf({ format: 'other' } as unknown as ScoreSnapshot)).toBe(
			'format',
		);
	});

	it('takes any object but a Blob or document as a snapshot', () => {
		expect(SnapshotReader.isSnapshot({})).toBe(true);
		expect(SnapshotReader.isSnapshot('<score-partwise/>')).toBe(false);
		expect(SnapshotReader.isSnapshot(new Blob([]))).toBe(false);
	});
});

function snapshotOf(config: Config): ScoreSnapshot {
	return {
		format: SNAPSHOT_FORMAT,
		version: SNAPSHOT_VERSION,
		config: snapshotConfig(config),
		paint: {
			strings: [],
			matrices: [],
			props: [],
			clips: [],
			dashes: [],
			states: [],
		},
		engraving: null,
		fold: null,
		pages: [],
		elements: {
			bounds: [0, 0, 0, 0],
			boxes: [],
			parts: [],
			fonts: [],
			notes: [],
			tabs: [],
			diagrams: [],
			targets: [],
		},
		sequence: {
			steps: [],
			segments: [],
			durationBeats: 0,
			measureCount: 0,
			ties: [],
		},
		gaps: [],
	};
}

function reasonOf(snapshot: ScoreSnapshot, overrides: Partial<Config> = {}) {
	try {
		new SnapshotReader({ ...DEFAULT_CONFIG, ...overrides }).check(snapshot);
		return null;
	} catch (e) {
		return e instanceof SnapshotMismatchError ? e.reason : e;
	}
}
