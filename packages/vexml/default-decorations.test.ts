import { beforeEach, describe, expect, it } from 'bun:test';
import { Rect } from 'webappwiz/geometry';
import { DefaultDecorations } from './default-decorations';
import { FakeDecoratable, NOTEHEAD } from './fake-decoratable';
import { FakeLayerHost } from './fake-layer-host';

describe('DefaultDecorations', () => {
	let host: FakeLayerHost;
	let decorations: DefaultDecorations;
	let target: FakeDecoratable;

	beforeEach(() => {
		host = new FakeLayerHost();
		decorations = new DefaultDecorations(host);
		target = new FakeDecoratable(new Rect(0, 0, 12, 10), NOTEHEAD);
	});

	it('paints the color and the halo on different layers of the same host', () => {
		decorations.color.set(target, '#2962ff');
		decorations.halo.set(target, 'rgba(41, 98, 255, 0.35)');
		expect(host.marks('content')).toEqual(['text:q:#2962ff:30px Bravura']);
		expect(host.marks('background')).toEqual([
			'fill:arc:rgba(41, 98, 255, 0.35)',
		]);
	});

	it('releases both kinds when disposed', () => {
		decorations.color.set(target, '#2962ff');
		decorations.halo.set(target, 'rgba(41, 98, 255, 0.35)');
		decorations.dispose();
		expect(host.layer('content')?.disposed).toBe(true);
		expect(host.layer('background')?.disposed).toBe(true);
		expect(decorations.color.has(target)).toBe(false);
		expect(decorations.halo.has(target)).toBe(false);
	});
});
