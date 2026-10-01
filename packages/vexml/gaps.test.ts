import { describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import type { Gap } from './config';
import { DynamicGlyphs } from './dynamic-glyphs';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { insertGaps } from './insert-gaps';
import { ScoreReader } from './score-reader';

const gapsOf = (gaps: Gap[]): Gaps =>
	new Gaps(gaps, new GapInserter(new ScoreReader(new DynamicGlyphs())));

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

const gap = (beforeMeasureIndex: number, durationMs: number): Gap => ({
	beforeMeasureIndex,
	durationMs,
});

describe('Gaps', () => {
	it('inserts positioned gaps, reporting their document indexes in config order', () => {
		const doc = document();
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
		const doc = document();
		const [intro, outro] = insertGaps(doc, [
			{ beforeMeasureIndex: 0 },
			{ beforeMeasureIndex: 2 },
		]);
		if (!intro || !outro) {
			throw new Error('insertGaps returned no measures');
		}
		const gaps = gapsOf([
			{ measure: outro, durationMs: 500 },
			{ measure: intro, durationMs: 1000, label: 'Intro' },
		]);
		gaps.resolve(doc);
		expect(doc.score.parts[0]?.measures).toHaveLength(4);
		expect(gaps.documentIndexes().map((d) => d.measureIndex)).toEqual([3, 0]);
	});

	it("accepts any part's measure as the gap's column", () => {
		const doc = document();
		insertGaps(doc, [{ beforeMeasureIndex: 1 }]);
		const measure = doc.score.parts[1]?.measures[1];
		if (!measure) {
			throw new Error('no gap measure in the second part');
		}
		const gaps = gapsOf([{ measure, durationMs: 1000 }]);
		gaps.resolve(doc);
		expect(gaps.documentIndexes().map((d) => d.measureIndex)).toEqual([1]);
	});

	it('rejects a gap measure no longer in the document, or in another one', () => {
		const doc = document();
		const [removed] = insertGaps(doc, [{ beforeMeasureIndex: 0 }]);
		removed?.remove();
		const [foreign] = insertGaps(document(), [{ beforeMeasureIndex: 0 }]);
		for (const measure of [removed, foreign]) {
			if (!measure) {
				throw new Error('insertGaps returned no measure');
			}
			expect(() =>
				gapsOf([{ measure, durationMs: 1000 }]).resolve(doc),
			).toThrow(/not in the rendered document/);
		}
	});

	it('rejects two gaps naming one measure, or a non-positive duration', () => {
		const doc = document();
		const [measure] = insertGaps(doc, [{ beforeMeasureIndex: 0 }]);
		if (!measure) {
			throw new Error('insertGaps returned no measure');
		}
		expect(() =>
			gapsOf([
				{ measure, durationMs: 1000 },
				{ measure, durationMs: 1000 },
			]).resolve(doc),
		).toThrow(RangeError);
		expect(() => gapsOf([gap(0, 0)]).resolve(document())).toThrow(RangeError);
	});

	it('resolving no gaps leaves the document untouched', () => {
		const doc = document();
		gapsOf([]).resolve(doc);
		expect(doc.score.parts[0]?.measures.map((m) => m.number)).toEqual([
			'1',
			'2',
		]);
	});
});
