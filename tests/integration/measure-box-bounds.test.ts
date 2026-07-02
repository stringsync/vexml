import { describe, expect, it } from 'bun:test';
import { renderTest } from '../testing/harness';

// Measure box bounds, end to end: render a bracketed notation+tab guitar part with a run of
// high ledger-line notes and a chord diagram, draw a debug rect around every measure box, and
// screenshot it. The box must enclose the stave connector (the bracket left of the staves) and
// every notehead/fret — including the notes rising well above the top staff line. Chord diagrams
// are deliberately NOT required to fit: they float above the stave so the playback cursor (which
// rides the box) stops at the staff, not the fret box (see draw-pass growMeasureTops).
describe('measure box bounds', () => {
	it.concurrent('encloses the bracket connector and high notes', async () => {
		const { result: violations, png } = await renderTest(
			'measure_box_bounds.musicxml',
			{},
			(score) => {
				// Outline every measure box on a content layer (score space) for visual review.
				const layer = score.addLayer('content');
				layer.ctx.strokeStyle = '#e53935';
				layer.ctx.lineWidth = 1;

				const bad: string[] = [];
				for (const box of score.getElements().measureBoxes()) {
					const r = box.rect;
					layer.ctx.strokeRect(r.x, r.y, r.w, r.h);
					// Every notehead and its tab fret must sit inside the box.
					for (const measure of box.getMeasures()) {
						for (const voice of measure.getVoices()) {
							for (const note of voice.getNotes()) {
								if (!r.contains(note.rect)) {
									bad.push(
										`note ${note.getPitch()} escapes measure ${box.getNumber()}`,
									);
								}
								const tab = note.getTabPosition();
								if (tab && !r.contains(tab.rect)) {
									bad.push(
										`fret ${tab.getFret()} escapes measure ${box.getNumber()}`,
									);
								}
							}
						}
					}
				}
				return bad;
			},
		);
		expect(violations).toEqual([]);
		expect(png).toMatchScreenshot('measure_box_bounds.png');
	});
});
