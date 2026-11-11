import { describe, expect, it } from 'bun:test';
import { ScrollController } from './scroll-controller';
import { Stage } from './stage';
import { TiledLayer } from './tiled-layer';

describe('Stage', () => {
	// Object.create skips the DOM-heavy constructor: the getter only touches the controller field.
	// Stage's DOM behavior (layers, transforms, real scrolling) is covered by the browser tests.
	it('lazily creates one ScrollController and returns it from scroller', () => {
		const stage = Object.create(Stage.prototype) as Stage;
		const scroller = stage.scroller;
		expect(scroller).toBeInstanceOf(ScrollController);
		expect(stage.scroller).toBe(scroller);
	});

	it('grows content layers to the base height but leaves viewport layers', () => {
		const grown: Record<string, number> = {};
		const fake = (kind: string) => {
			const layer = Object.create(TiledLayer.prototype) as {
				kind: string;
				surface: unknown;
			};
			layer.kind = kind;
			layer.surface = { grow: (h: number) => (grown[kind] = h) };
			return layer;
		};
		const stage = Object.create(Stage.prototype) as unknown as Record<
			string,
			unknown
		>;
		stage.base = { style: { getPropertyValue: () => '2581px' } };
		stage.layers = new Set([fake('content'), fake('viewport')]);
		(stage as unknown as { growLayers(): void }).growLayers();
		expect(grown).toEqual({ content: 2581 });
	});
});
