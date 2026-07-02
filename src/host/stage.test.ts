import { describe, expect, it } from 'bun:test';
import { ScrollController } from './scroll-controller';
import { Stage } from './stage';

describe('Stage', () => {
	// Object.create skips the DOM-heavy constructor — the getter only touches the controller field.
	// Stage's DOM behavior (layers, transforms, real scrolling) is covered by the browser tests.
	it('lazily creates one ScrollController and returns it from scroller', () => {
		const stage = Object.create(Stage.prototype) as Stage;
		const scroller = stage.scroller;
		expect(scroller).toBeInstanceOf(ScrollController);
		expect(stage.scroller).toBe(scroller);
	});
});
