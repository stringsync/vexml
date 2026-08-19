import { describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import { isHighlightable, isPlayable } from './element';
import { FakeViewport } from './fake-viewport';
import type { Measure } from './measure';
import { MeasureBox } from './measure-box';
import { System } from './system';

/* One part, one measure, one note: the smallest score a MeasureBox can point back at. */
function fixture() {
	const mmeasure = MDocument.empty()
		.score.addPart({ id: 'P1', name: 'M' })
		.addMeasure();
	mmeasure
		.getOrCreateVoice('1')
		.addNote({ step: 'C', octave: 4, type: 'quarter' });
	const viewport = new FakeViewport();
	const rect = new Rect(0, 0, 200, 100);
	const boxes: MeasureBox[] = [];
	const system = new System(rect, viewport, 0, boxes);
	const measures: Measure[] = [];
	const box = new MeasureBox(
		rect,
		viewport,
		'1',
		0,
		[mmeasure],
		system,
		measures,
	);
	boxes.push(box);
	return { box, system, mmeasure };
}

describe('MeasureBox', () => {
	it('exposes its printed number, stable index, and system', () => {
		const { box, system } = fixture();
		expect(box.getNumber()).toBe('1');
		expect(box.getIndex()).toBe(0);
		expect(box.type).toBe('measure');
		expect(box.getSystem()).toBe(system);
		expect(system.getMeasureBoxes()).toEqual([box]);
	});

	it('getSources returns the mdom measures it spans', () => {
		const { box, mmeasure } = fixture();
		expect(box.getSources()).toEqual([mmeasure]);
	});

	it('is neither highlightable nor playable in v1', () => {
		const { box } = fixture();
		expect(isHighlightable(box)).toBe(false);
		expect(isPlayable(box)).toBe(false);
	});
});
