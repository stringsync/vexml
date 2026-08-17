import { describe, expect, it } from 'bun:test';
import type { Jump } from './sequence';
import { MeasureSequenceIterator } from './sequence-factory';

// ── MeasureSequenceIterator (ported from legacy vexml) ──

function order(measures: Array<{ index: number; jumps: Jump[] }>): number[] {
	return [...new MeasureSequenceIterator(measures)];
}

describe('MeasureSequenceIterator', () => {
	it('iterator: empty when there are no measures', () => {
		expect(order([])).toEqual([]);
	});

	it('iterator: same as input when there are no repeats', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [] },
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 2]);
	});

	it('iterator: repeats a single measure', () => {
		expect(
			order([
				{
					index: 0,
					jumps: [{ type: 'repeatstart' }, { type: 'repeatend', times: 1 }],
				},
			]),
		).toEqual([0, 0]);
	});

	it('iterator: repeats a single measure multiple times', () => {
		expect(
			order([
				{
					index: 0,
					jumps: [{ type: 'repeatstart' }, { type: 'repeatend', times: 3 }],
				},
			]),
		).toEqual([0, 0, 0, 0]);
	});

	it('iterator: repeats a single measure when the start is not at the beginning', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [{ type: 'repeatstart' }] },
				{ index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 2, 1, 2]);
	});

	it('iterator: repeats multiple measures', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 0, 1]);
	});

	it('iterator: repeats multiple measures multiple times', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 2 }] },
			]),
		).toEqual([0, 1, 0, 1, 0, 1]);
	});

	it('iterator: repeats endings', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 0, 2]);
	});

	it('iterator: repeats multiple endings', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 2, last: true, number: 1 }],
				},
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 0, 1, 0, 2]);
	});

	it('iterator: handles implicit start repeats', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 0, 1]);
	});

	it('iterator: handles multiple implicit start repeats', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
				{ index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 0, 1, 2, 0, 1, 0, 1, 2]);
	});

	it('iterator: handles a repeat ending with an implicit start', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 0, 2]);
	});

	it('iterator: continues past a repeat block', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
				{ index: 2, jumps: [] },
				{ index: 3, jumps: [] },
			]),
		).toEqual([0, 1, 0, 1, 2, 3]);
	});

	it('iterator: handles a standalone repeat start with no matching end', () => {
		expect(
			order([
				{ index: 0, jumps: [] },
				{ index: 1, jumps: [{ type: 'repeatstart' }] },
				{ index: 2, jumps: [] },
			]),
		).toEqual([0, 1, 2]);
	});

	it('iterator: handles two non-nested repeats in sequence', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 1 }] },
				{ index: 2, jumps: [{ type: 'repeatstart' }] },
				{ index: 3, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 0, 1, 2, 3, 2, 3]);
	});

	it('iterator: replays an inner repeat during each pass of an outer repeat', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatstart' }] },
				{ index: 2, jumps: [{ type: 'repeatend', times: 1 }] },
				{ index: 3, jumps: [{ type: 'repeatend', times: 1 }] },
			]),
		).toEqual([0, 1, 2, 1, 2, 3, 0, 1, 2, 1, 2, 3]);
	});

	it('iterator: plays the 1st ending N times before advancing to the 2nd ending', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 2, last: true, number: 1 }],
				},
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 3 }],
				},
				{ index: 3, jumps: [] },
			]),
		).toEqual([0, 1, 0, 1, 0, 2, 3]);
	});

	it('iterator: plays three endings in order, each once', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 2 }],
				},
				{
					index: 3,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 3 }],
				},
				{ index: 4, jumps: [] },
			]),
		).toEqual([0, 1, 0, 2, 0, 3, 4]);
	});

	it('iterator: plays a multi-measure ending through before jumping back', () => {
		// M2-M3 are one first ending, M4-M5 one second ending: the back-jump happens at the
		// run's last measure, not at every measure it covers.
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 1, last: false, number: 1 }],
				},
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{
					index: 3,
					jumps: [{ type: 'repeatending', times: 1, last: false, number: 2 }],
				},
				{
					index: 4,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 2 }],
				},
				{ index: 5, jumps: [] },
			]),
		).toEqual([0, 1, 2, 0, 3, 4, 5]);
	});

	it('iterator: skips every measure of an exhausted multi-measure ending', () => {
		// On the second pass the whole first ending (M2-M3) is skipped, not just its last
		// measure — otherwise the second pass would replay part of the first ending.
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{
					index: 1,
					jumps: [{ type: 'repeatending', times: 2, last: false, number: 1 }],
				},
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 2, last: true, number: 1 }],
				},
				{
					index: 3,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 3 }],
				},
				{ index: 4, jumps: [] },
			]),
		).toEqual([0, 1, 2, 0, 1, 2, 0, 3, 4]);
	});

	it('iterator: starts a new volta group when an ending number restarts', () => {
		// repeats_nested.musicxml: an outer block (M1) holding an inner one (M2), each closing
		// with its own 1st/2nd endings. M3-M6 are four consecutive ending measures with no plain
		// measure between them, so only the numbering restarting at 1 on M5 separates the outer
		// group from the inner one. Each pass of the outer block replays the inner block whole.
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatstart' }] },
				{
					index: 2,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{
					index: 3,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 2 }],
				},
				{
					index: 4,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 1 }],
				},
				{
					index: 5,
					jumps: [{ type: 'repeatending', times: 1, last: true, number: 2 }],
				},
			]),
		).toEqual([0, 1, 2, 1, 3, 4, 0, 1, 2, 1, 3, 5]);
	});

	it('iterator: treats a repeatend with times: 0 as a no-op', () => {
		expect(
			order([
				{ index: 0, jumps: [{ type: 'repeatstart' }] },
				{ index: 1, jumps: [{ type: 'repeatend', times: 0 }] },
			]),
		).toEqual([0, 1]);
	});
});
