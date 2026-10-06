import { beforeEach, describe, expect, it } from 'bun:test';
import { type BarlineSpec, MDocument, type Measure } from '@stringsync/mdom';
import type { GapPosition } from './config';
import { DynamicGlyphs } from './dynamic-glyphs';
import { GapInserter } from './gap-inserter';
import { MeasureSequenceIterator } from './measure-sequence-iterator';
import { ScoreReader } from './score-reader';

describe('GapInserter', () => {
	let reader: ScoreReader;
	let inserter: GapInserter;

	beforeEach(() => {
		reader = new ScoreReader(new DynamicGlyphs());
		inserter = new GapInserter(reader);
	});

	it("inserts an empty, unnumbered measure into every part, returning the first part's", () => {
		const doc = score([[], []]);
		const [gap] = inserter.insert(doc, [bar(1)]);
		expect(numbers(doc, 0)).toEqual(['1', '', '2']);
		expect(numbers(doc, 1)).toEqual(['1', '', '2']);
		expect(
			doc.score.parts.map((part) => part.measures[1]?.notes.length),
		).toEqual([0, 0]);
		expect(gap).toBe(doc.score.parts[0]?.measures[1] as Measure);
	});

	it("a leading gap copies its right neighbor's signatures", () => {
		const doc = score([[], []]);
		const [gap] = inserter.insert(doc, [bar(0)]);
		expect(gap?.getClef('1')?.sign).toBe('G');
		expect(gap?.getTime('1')?.beats).toBe('4');
	});

	it('maps a bar index straight through when nothing repeats', () => {
		const doc = score([[], [], []]);
		const gaps = inserter.insert(doc, [bar(0), bar(2), bar(3)]);
		expect(gaps.map((m) => m.index)).toEqual([0, 3, 5]);
		expect(numbers(doc)).toEqual(['', '1', '2', '', '3', '']);
	});

	it('counts bars against the document before any gap of the call', () => {
		const doc = score([[], [], []]);
		const gaps = inserter.insert(doc, [bar(2), bar(1)]);
		expect(numbers(doc)).toEqual(['1', '', '2', '', '3']);
		expect(gaps.map((m) => m.index)).toEqual([3, 1]);
	});

	it('places a gap before or after a repeat, leaving it as written', () => {
		// |: 1 2 :| 3 plays 1 2 1 2 3.
		const doc = score([[FORWARD], [BACKWARD], []]);
		inserter.insert(doc, [bar(0), bar(4), bar(5)]);
		expect(numbers(doc)).toEqual(['', '1', '2', '', '3', '']);
		expect(playback(reader, doc)).toEqual([0, 1, 2, 1, 2, 3, 4, 5]);
	});

	it('refuses a bar inside a repeat, before touching the document', () => {
		const doc = score([[FORWARD], [BACKWARD], []]);
		expect(() => inserter.insert(doc, [bar(0), bar(3)])).toThrow(RangeError);
		expect(() => inserter.insert(doc, [bar(1)])).toThrow(RangeError);
		expect(numbers(doc)).toEqual(['1', '2', '3']);
	});

	it('refuses the bar before a later ending, which would split the volta group', () => {
		// |: 1 |1. 2 :|2. 3 | 4 plays 1 2 1 3 4.
		const doc = score([
			[FORWARD],
			[ending('1', 'start'), ending('1', 'stop', BACKWARD)],
			[ending('2', 'start'), ending('2', 'stop')],
			[FINAL],
		]);
		expect(() => inserter.insert(doc, [bar(3)])).toThrow(RangeError);
		inserter.insert(doc, [bar(4)]);
		expect(numbers(doc)).toEqual(['1', '2', '3', '', '4']);
		expect(playback(reader, doc)).toEqual([0, 1, 0, 2, 3, 4]);
	});

	it.each([
		1, 2, 3, 4, 6,
	])('refuses a bar inside an inner repeat, and inside its outer one (bar %i)', (index) => {
		// |: 1 |: 2 :| 3 :| plays 1 2 2 3 1 2 2 3.
		const doc = score([[FORWARD], [FORWARD, BACKWARD], [BACKWARD]]);
		expect(() => inserter.insert(doc, [bar(index)])).toThrow(RangeError);
	});

	it('accepts the bar after an outer repeat that holds an inner one', () => {
		const doc = score([[FORWARD], [FORWARD, BACKWARD], [BACKWARD]]);
		inserter.insert(doc, [bar(8)]);
		expect(numbers(doc)).toEqual(['1', '2', '3', '']);
	});

	it('places a measure index as written, even inside a repeat', () => {
		const doc = score([[FORWARD], [BACKWARD], []]);
		inserter.insert(doc, [{ beforeMeasureIndex: 1 }]);
		expect(numbers(doc)).toEqual(['1', '', '2', '3']);
		expect(playback(reader, doc)).toEqual([0, 1, 2, 0, 1, 2, 3]);
	});

	it('rejects a position with both or neither index, or one out of range', () => {
		const doc = score([[FORWARD], [BACKWARD]]);
		expect(() => inserter.insert(doc, [{} as unknown as GapPosition])).toThrow(
			TypeError,
		);
		expect(() =>
			inserter.insert(doc, [
				{ beforeBarIndex: 0, beforeMeasureIndex: 0 } as unknown as GapPosition,
			]),
		).toThrow(TypeError);
		expect(() => inserter.insert(doc, [bar(5)])).toThrow(RangeError);
		expect(() => inserter.insert(doc, [bar(1.5)])).toThrow(RangeError);
		expect(() => inserter.insert(doc, [{ beforeMeasureIndex: 3 }])).toThrow(
			RangeError,
		);
		expect(numbers(doc)).toEqual(['1', '2']);
	});
});

const FORWARD: BarlineSpec = {
	location: 'left',
	barStyle: 'heavy-light',
	repeat: { direction: 'forward' },
};
const BACKWARD: BarlineSpec = {
	barStyle: 'light-heavy',
	repeat: { direction: 'backward' },
};
const FINAL: BarlineSpec = { barStyle: 'light-heavy' };
const ending = (
	number: string,
	type: 'start' | 'stop' | 'discontinue',
	more: BarlineSpec = {},
): BarlineSpec => ({
	location: type === 'start' ? 'left' : 'right',
	...more,
	ending: { type, number },
});

/* A two-part score, one whole note per measure, numbered 1..n, with each measure's barlines
 * as given: both parts carry them, as exported scores do. */
function score(barlines: BarlineSpec[][]): MDocument {
	const doc = MDocument.empty();
	for (const id of ['P1', 'P2']) {
		const part = doc.score.addPart({ id, name: id });
		for (const [i, specs] of barlines.entries()) {
			const measure = part.addMeasure();
			if (i === 0) {
				measure.setTime({ beats: 4, beatType: 4 });
				measure.setClef({ sign: 'G', line: 2 });
			}
			for (const spec of specs.filter((s) => s.location === 'left')) {
				measure.addBarline(spec);
			}
			measure
				.getOrCreateVoice('1')
				.addNote({ step: 'C', octave: 5, type: 'whole' });
			for (const spec of specs.filter((s) => s.location !== 'left')) {
				measure.addBarline(spec);
			}
		}
	}
	return doc;
}

const numbers = (doc: MDocument, part = 0): string[] =>
	doc.score.parts[part]?.measures.map((m) => m.number) ?? [];

const playback = (reader: ScoreReader, doc: MDocument): number[] => {
	const measures = doc.score.parts[0]?.measures ?? [];
	const jumps = reader.measureJumps(measures);
	return [
		...new MeasureSequenceIterator(
			measures.map((_, index) => ({ index, jumps: jumps[index] ?? [] })),
		),
	];
};

const bar = (beforeBarIndex: number): GapPosition => ({ beforeBarIndex });
