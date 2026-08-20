import { describe, expect, it } from 'bun:test';
import { renderer } from './renderer';

// Measure box bounds, end to end: render a bracketed notation+tab guitar part with a run of
// high ledger-line notes and a chord diagram, draw a debug rect around every measure box, and
// screenshot it. The box must enclose the stave connector (the bracket left of the staves) and
// every notehead/fret — including the notes rising well above the top staff line. Chord diagrams
// are deliberately NOT required to fit: they float above the stave so the playback cursor (which
// rides the box) stops at the staff, not the fret box (see draw-pass growMeasureTops).
describe('measure box bounds', () => {
	it.concurrent('encloses the bracket connector and high notes', async () => {
		const { result: violations, png } = await renderer.render(
			'measure_box_bounds.musicxml',
			{},
			{ fn: (score) => window.measureBoxViolations(score) },
		);
		expect(violations).toEqual([]);
		expect(png).toMatchScreenshot('measure_box_bounds.png');
	});
});
