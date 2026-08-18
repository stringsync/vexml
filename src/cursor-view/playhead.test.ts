import { describe, expect, it } from 'bun:test';
import type { CursorChangeEvent } from '../events';
import { Rect } from '../geometry';
import { FakeLayer } from '../layer/fake-layer';
import { Playhead } from './playhead';

function changeAt(rect: Rect): CursorChangeEvent {
	return {
		timeMs: 0,
		timeBeats: 0,
		index: 0,
		position: { rect, getBoundingClientRect: () => ({}) as DOMRect },
		active: [],
		highlighted: [],
		started: [],
		sustained: [],
		stopped: [],
		done: false,
	};
}

describe('Playhead', () => {
	it('draws a vertical bar straddling the onset x, spanning the system', () => {
		const layer = new FakeLayer();
		const view = new Playhead(layer); // default width 2
		view.render(changeAt(new Rect(10, 0, 1, 100)));
		// Nothing was drawn before, so there's nothing to clear on the first render.
		expect(layer.recording.clears).toEqual([]);
		expect(layer.recording.fills).toEqual([
			{ x: 9, y: 0, w: 2, h: 100, style: '#2563eb' },
		]);
	});

	it('honors color and width options', () => {
		const layer = new FakeLayer();
		const view = new Playhead(layer, { color: 'red', widthPx: 4 });
		view.render(changeAt(new Rect(10, 5, 1, 80)));
		expect(layer.recording.fills).toEqual([
			{ x: 8, y: 5, w: 4, h: 80, style: 'red' },
		]);
	});

	it('erases exactly the previous bar (1px pad) on each render and disposes its layer', () => {
		const layer = new FakeLayer();
		const view = new Playhead(layer);
		view.render(changeAt(new Rect(10, 0, 1, 100)));
		view.render(changeAt(new Rect(20, 0, 1, 100)));
		// Only the previous bar's region is cleared — never the whole (score-sized) bitmap.
		expect(layer.recording.clears).toEqual([{ x: 8, y: -1, w: 4, h: 102 }]);
		expect(layer.recording.fills).toHaveLength(2);
		expect(layer.recording.fills.at(-1)?.x).toBe(19);
		view.dispose();
		expect(layer.disposed).toBe(true);
	});
});
