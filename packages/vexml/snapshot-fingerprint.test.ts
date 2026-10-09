import { describe, expect, it } from 'bun:test';
import {
	type ScoreSnapshot,
	SNAPSHOT_FORMAT,
	SNAPSHOT_VERSION,
} from './score-snapshot';
import { SnapshotFingerprint } from './snapshot-fingerprint';

describe('SnapshotFingerprint', () => {
	it('names equal snapshots alike', () => {
		expect(SnapshotFingerprint.of(snapshotOf([1, 0, 0.1 + 0.2]))).toBe(
			SnapshotFingerprint.of(snapshotOf([1, 0, 0.1 + 0.2])),
		);
	});

	it('tells apart streams that differ in a bit of one coordinate', () => {
		expect(SnapshotFingerprint.of(snapshotOf([1, 0, 0.1 + 0.2]))).not.toBe(
			SnapshotFingerprint.of(snapshotOf([1, 0, 0.3])),
		);
	});

	it('tells apart snapshots whose tables differ', () => {
		const red = snapshotOf([1, 0]);
		const blue = {
			...red,
			paint: { ...red.paint, props: [{ fillStyle: 'blue' }] },
		};
		expect(SnapshotFingerprint.of(red)).not.toBe(SnapshotFingerprint.of(blue));
	});
});

function snapshotOf(ops: number[]): ScoreSnapshot {
	return {
		format: SNAPSHOT_FORMAT,
		version: SNAPSHOT_VERSION,
		config: {} as ScoreSnapshot['config'],
		paint: {
			strings: [],
			matrices: [],
			props: [{ fillStyle: 'red' }],
			clips: [],
			dashes: [],
			states: [],
		},
		engraving: { ops, width: 1, height: 1, origin: [0, 0], scale: 1 },
		fold: null,
		pages: [],
		elements: {} as ScoreSnapshot['elements'],
		sequence: {} as ScoreSnapshot['sequence'],
		gaps: [],
		outlines: null,
	};
}
