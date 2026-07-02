import type { Measure as MMeasure, Part as MPart } from '@stringsync/mdom';
import { Measure } from '../elements/measure';
import { MeasureBox } from '../elements/measure-box';
import { Part } from '../elements/part';
import { System } from '../elements/system';
import { Rect } from '../geometry';
import type { Viewport } from '../host/stage';

/* The minimal real tree around one mdom measure (System -> MeasureBox <- Measure -> Part), for
 * tests that need a Note's measure without running the ElementFactory. No voices. */
export function measureFixture(
	mpart: MPart,
	mmeasure: MMeasure,
	viewport: Viewport,
	rect = new Rect(0, 0, 100, 50),
): Measure {
	const boxes: MeasureBox[] = [];
	const system = new System(rect, viewport, 0, boxes);
	const boxMeasures: Measure[] = [];
	const box = new MeasureBox(
		rect,
		viewport,
		mmeasure.number,
		mmeasure.index,
		[mmeasure],
		system,
		boxMeasures,
	);
	boxes.push(box);
	const partMeasures: Measure[] = [];
	const part = new Part(mpart, partMeasures);
	const measure = new Measure(mmeasure, part, box, []);
	boxMeasures.push(measure);
	partMeasures.push(measure);
	return measure;
}
