import { describe, expect, it } from 'bun:test';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// Measure box bounds, end to end: render a bracketed notation+tab guitar part with a run of
// high ledger-line notes and a chord diagram, draw a debug rect around every measure box, and
// screenshot it. The box must enclose the stave connector (the bracket left of the staves) and
// every notehead/fret, including the notes rising well above the top staff line. Chord diagrams
// are deliberately NOT required to fit: they float above the stave so the playback cursor (which
// rides the box) stops at the staff, not the fret box (see draw-pass growMeasureTops).
describe('measure box bounds', () => {
	it.concurrent('encloses the bracket connector and high notes', async () => {
		const { result: escapes, image } = await testing.eval(
			'measure_box_bounds.musicxml',
			{},
			outlineBoxesAndCollectEscapes,
		);
		expect(escapes).toEqual([]);
		expect(image).toMatchScreenshot('measure_box_bounds.png');
	});
});

// Runs in the page via toString(), so it must stay self-contained: no closing over test scope.
function outlineBoxesAndCollectEscapes({ score }: VexmlContext): string[] {
	// Outline every measure box on a content layer (score space) for visual review.
	const layer = score.addLayer('content');
	layer.ctx.strokeStyle = '#e53935';
	layer.ctx.lineWidth = 1;

	return score
		.getElements()
		.measureBoxes()
		.flatMap((box) => {
			const r = box.rect;
			layer.ctx.strokeRect(r.x, r.y, r.w, r.h);
			return box
				.getMeasures()
				.flatMap((measure) => measure.getVoices())
				.flatMap((voice) => voice.getNotes())
				.flatMap((note) => [
					{ label: `note ${note.getPitch()}`, rect: note.rect },
					// A notation-only note has no fret, so it contributes one glyph, not two.
					...[note.getTabPosition()]
						.filter((tab) => tab !== null)
						.map((tab) => ({ label: `fret ${tab.getFret()}`, rect: tab.rect })),
				])
				.filter((glyph) => !r.containsRect(glyph.rect))
				.map((glyph) => `${glyph.label} escapes measure ${box.getNumber()}`);
		});
}
