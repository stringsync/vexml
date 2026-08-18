import { describe, expect, it } from 'bun:test';
import { ColorStyle } from '../decoration-style/color-style';
import { HaloStyle } from '../decoration-style/halo-style';
import { Rect } from '../geometry';
import { FakeLayerHost } from '../layer-host/fake-layer-host';
import {
	decoratable,
	GLYPH,
	HALO,
	marksSinceLastClear,
} from './decoration-harness';
import { DefaultDecoration } from './default-decoration';

describe('DefaultDecoration', () => {
	it('the overlay layer is created lazily, on the first decoration', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		expect(host.created).toHaveLength(0);
		colors.set(decoratable(new Rect(0, 0, 12, 10), GLYPH), '#2962ff');
		expect(host.created).toHaveLength(1);
	});

	it('a color stamps the notehead glyph in the color and reports has()', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		const target = decoratable(new Rect(10, 10, 12, 10), GLYPH);
		colors.set(target, '#2962ff');
		expect(colors.has(target)).toBe(true);
		// The exact glyph (text + font) vexflow drew, replayed in the chosen color.
		expect(marksSinceLastClear(host.ops('content'))).toEqual([
			'text:q:#2962ff:30px Bravura',
		]);
	});

	it('a glyph-less target (a rest) falls back to a filled ellipse', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		colors.set(decoratable(new Rect(0, 0, 12, 10), null), '#2962ff');
		expect(marksSinceLastClear(host.ops('content'))).toEqual([
			'fill:ellipse:#2962ff',
		]);
	});

	it('set(null) clears the decoration, drawing nothing', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
		colors.set(target, '#ff0000');
		colors.set(target, null);
		expect(colors.has(target)).toBe(false);
		expect(host.ops('content').at(-1)).toBe('clear');
		expect(marksSinceLastClear(host.ops('content'))).toEqual([]);
	});

	it('the halo draws on a background layer in its color, behind the color layer', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		const halos = new DefaultDecoration(host, new HaloStyle());
		const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
		colors.set(target, '#2962ff');
		halos.set(target, 'rgba(41, 98, 255, 0.35)');
		// The color stamps the notehead on the content (over) layer; the halo fills its circle on the
		// background (behind) layer in the chosen color.
		expect(marksSinceLastClear(host.ops('content'))).toEqual([
			'text:q:#2962ff:30px Bravura',
		]);
		expect(marksSinceLastClear(host.ops('background'))).toEqual([HALO]);
	});

	it('a halo set(null) removes it', () => {
		const host = new FakeLayerHost();
		const halos = new DefaultDecoration(host, new HaloStyle());
		const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
		halos.set(target, 'rgba(41, 98, 255, 0.35)');
		expect(halos.has(target)).toBe(true);
		halos.set(target, null);
		expect(halos.has(target)).toBe(false);
		expect(marksSinceLastClear(host.ops('background'))).toEqual([]);
	});

	it('a repaint redraws neighbors whose bounds overlap the changed region', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		colors.set(decoratable(new Rect(0, 0, 12, 10), GLYPH), '#111111');
		colors.set(decoratable(new Rect(20, 0, 12, 10), GLYPH), '#222222');
		// The rects nearly touch, so clearing the second's padded region requires restamping the
		// first — otherwise its edge pixels would be wiped.
		expect(marksSinceLastClear(host.ops('content'))).toEqual([
			'text:q:#111111:30px Bravura',
			'text:q:#222222:30px Bravura',
		]);
	});

	it('a repaint leaves decorations outside the changed region untouched', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		colors.set(decoratable(new Rect(0, 0, 12, 10), GLYPH), '#111111');
		colors.set(decoratable(new Rect(500, 0, 12, 10), GLYPH), '#222222');
		// The distant first decoration's pixels aren't in the cleared region, so it isn't redrawn.
		expect(marksSinceLastClear(host.ops('content'))).toEqual([
			'text:q:#222222:30px Bravura',
		]);
	});

	it('an off() while already off is a no-op — no layer, no paint', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		colors.set(decoratable(new Rect(0, 0, 12, 10), GLYPH), null);
		expect(host.created).toHaveLength(0);
	});

	it('dispose disposes the layer and clears state', () => {
		const host = new FakeLayerHost();
		const colors = new DefaultDecoration(host, new ColorStyle());
		const halos = new DefaultDecoration(host, new HaloStyle());
		const target = decoratable(new Rect(0, 0, 12, 10), GLYPH);
		colors.set(target, '#2962ff');
		halos.set(target, 'rgba(41, 98, 255, 0.35)');
		const content = host.layer('content');
		const background = host.layer('background');
		colors.dispose();
		halos.dispose();
		expect(content?.disposed).toBe(true);
		expect(background?.disposed).toBe(true);
		expect(colors.has(target)).toBe(false);
		expect(halos.has(target)).toBe(false);
	});
});
