import { describe, expect, it } from 'bun:test';
import { FakePaintProbe } from './fake-paint-probe';
import { GlyphCollector } from './glyph-collector';
import { PaintState } from './paint-state';

describe('GlyphCollector', () => {
	it('answers with the probe it wraps', () => {
		const state = PaintState.INITIAL.with('font', '12px Bravura');
		const collector = new GlyphCollector(new FakePaintProbe());
		expect(collector.measureText(state, 'ab').width).toBe(
			new FakePaintProbe().measureText(state, 'ab').width,
		);
	});

	it('notes each character it measures once, by font', () => {
		const collector = new GlyphCollector(new FakePaintProbe());
		const bravura = PaintState.INITIAL.with('font', '30pt Bravura');
		const text = PaintState.INITIAL.with('font', '12px Inter');
		collector.measureText(bravura, '\uE050\uE0A4');
		collector.measureText(bravura, '\uE0A4\uE566');
		collector.measureText(text, 'élan');

		expect(collector.samples()).toEqual([
			{ font: '30pt Bravura', text: '\uE050\uE0A4\uE566' },
			{ font: '12px Inter', text: 'élan' },
		]);
	});
});
