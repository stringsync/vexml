import { describe, expect, it } from 'bun:test';
import { Rect } from 'webappwiz/geometry';
import { DefaultDecorations } from './default-decorations';
import { FakeDecoratable, NOTEHEAD } from './fake-decoratable';
import { FakeLayerHost } from './fake-layer-host';

describe('DefaultDecorations', () => {
	it('the color and the halo paint different layers of the same host', () => {
		const host = new FakeLayerHost();
		const decorations = new DefaultDecorations(host);
		const target = new FakeDecoratable(new Rect(0, 0, 12, 10), NOTEHEAD);
		decorations.color.set(target, '#2962ff');
		decorations.halo.set(target, 'rgba(41, 98, 255, 0.35)');
		expect(host.marks('content')).toEqual(['text:q:#2962ff:30px Bravura']);
		expect(host.marks('background')).toEqual([
			'fill:arc:rgba(41, 98, 255, 0.35)',
		]);
	});

	it('disposing releases both kinds', () => {
		const host = new FakeLayerHost();
		const decorations = new DefaultDecorations(host);
		const target = new FakeDecoratable(new Rect(0, 0, 12, 10), NOTEHEAD);
		decorations.color.set(target, '#2962ff');
		decorations.halo.set(target, 'rgba(41, 98, 255, 0.35)');
		decorations.dispose();
		expect(host.layer('content')?.disposed).toBe(true);
		expect(host.layer('background')?.disposed).toBe(true);
		expect(decorations.color.has(target)).toBe(false);
		expect(decorations.halo.has(target)).toBe(false);
	});
});
