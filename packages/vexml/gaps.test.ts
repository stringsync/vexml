import { beforeEach, describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import type { Gap } from './config';
import { DynamicGlyphs } from './dynamic-glyphs';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { insertGaps } from './insert-gaps';
import { ScoreReader } from './score-reader';

describe('Gaps', () => {
	let doc: MDocument;

	beforeEach(() => {
		doc = document();
	});

	it('inserts positioned gaps, reporting their document indexes in config order', () => {
		const gaps = gapsOf([gap(1, 1000), gap(0, 2000)]);
		gaps.resolve(doc);
		expect(doc.score.parts[0]?.measures.map((m) => m.number)).toEqual([
			'',
			'1',
			'',
			'2',
		]);
		expect(gaps.documentIndexes()).toEqual([
			{ gap: gap(1, 1000), measureIndex: 2 },
			{ gap: gap(0, 2000), measureIndex: 0 },
		]);
		expect([...gaps.byMeasureIndex().keys()].sort()).toEqual([0, 2]);
	});

	it('finds gaps naming measures already in the document, inserting nothing', () => {
		const gaps = gapsOf(
			insertGaps(doc, [{ beforeMeasureIndex: 0 }, { beforeMeasureIndex: 2 }])
				.reverse()
				.map((measure, i) => ({
					measure,
					durationMs: 500 * (i + 1),
					label: `Gap ${i}`,
				})),
		);
		gaps.resolve(doc);
		expect(doc.score.parts[0]?.measures).toHaveLength(4);
		expect(gaps.documentIndexes().map((d) => d.measureIndex)).toEqual([3, 0]);
	});

	it("accepts any part's measure as the gap's column", () => {
		insertGaps(doc, [{ beforeMeasureIndex: 1 }]);
		const secondPartGapMeasures = doc.score.parts
			.slice(1)
			.flatMap((part) => part.measures.slice(1, 2));
		const gaps = gapsOf(
			secondPartGapMeasures.map((measure) => ({ measure, durationMs: 1000 })),
		);
		gaps.resolve(doc);
		expect(gaps.documentIndexes().map((d) => d.measureIndex)).toEqual([1]);
	});

	it('throws when a gap measure is no longer in the document', () => {
		const removed = insertGaps(doc, [{ beforeMeasureIndex: 0 }]);
		removed.forEach((measure) => {
			measure.remove();
		});
		expect(() =>
			gapsOf(removed.map((measure) => ({ measure, durationMs: 1000 }))).resolve(
				doc,
			),
		).toThrow(/not in the rendered document/);
	});

	it('throws when a gap measure belongs to another document', () => {
		const foreign = insertGaps(document(), [{ beforeMeasureIndex: 0 }]);
		expect(() =>
			gapsOf(foreign.map((measure) => ({ measure, durationMs: 1000 }))).resolve(
				doc,
			),
		).toThrow(/not in the rendered document/);
	});

	it('throws when two gaps name one measure', () => {
		const measures = insertGaps(doc, [{ beforeMeasureIndex: 0 }]);
		expect(() =>
			gapsOf(
				[...measures, ...measures].map((measure) => ({
					measure,
					durationMs: 1000,
				})),
			).resolve(doc),
		).toThrow(RangeError);
	});

	it('throws when a gap duration is not positive', () => {
		expect(() => gapsOf([gap(0, 0)]).resolve(doc)).toThrow(RangeError);
	});

	it('leaves the document untouched when resolving no gaps', () => {
		gapsOf([]).resolve(doc);
		expect(doc.score.parts[0]?.measures.map((m) => m.number)).toEqual([
			'1',
			'2',
		]);
	});
});

function gapsOf(gaps: Gap[]): Gaps {
	return new Gaps(gaps, new GapInserter(new ScoreReader(new DynamicGlyphs())));
}

/* A two-part, two-measure score: the smallest thing a gap can be inserted into that still
 * has signatures to carry across the cut and a second part to keep in step. */
function document(): MDocument {
	const doc = MDocument.empty();
	const score = doc.score;

	const treble = score.addPart({ id: 'P1', name: 'A' });
	const first = treble.addMeasure();
	first.setKey({ fifths: 2 });
	first.setTime({ beats: 4, beatType: 4 });
	first.setClef({ sign: 'G', line: 2 });
	for (const measure of [first, treble.addMeasure()]) {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'whole' });
	}

	const bass = score.addPart({ id: 'P2', name: 'B' });
	const bassFirst = bass.addMeasure();
	bassFirst.setClef({ sign: 'F', line: 4 });
	for (const measure of [bassFirst, bass.addMeasure()]) {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 3, type: 'whole' });
	}

	return doc;
}

function gap(beforeMeasureIndex: number, durationMs: number): Gap {
	return { beforeMeasureIndex, durationMs };
}
