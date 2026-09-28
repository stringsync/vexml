import { describe, expect, it } from 'bun:test';
import { Rect } from 'webappwiz/geometry';
import type { CursorChangeEvent } from './events';
import { FakeMarker } from './fake-marker';
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
	it('shows a vertical bar straddling the onset x, spanning the system', () => {
		const marker = new FakeMarker();
		const view = new Playhead(marker); // default width 2
		view.render(changeAt(new Rect(10, 0, 1, 100)));
		expect(marker.shown).toEqual({
			rect: new Rect(9, 0, 2, 100),
			color: '#2563eb',
		});
	});

	it('hides immediately, tracks movement while hidden, and restores only the latest bar', () => {
		const marker = new FakeMarker();
		const view = new Playhead(marker);
		view.render(changeAt(new Rect(10, 0, 1, 100)));
		view.setVisible(false);
		expect(marker.shown).toBeNull();
		view.render(changeAt(new Rect(40, 0, 1, 100)));
		expect(marker.shown).toBeNull();
		view.setVisible(true);
		expect(marker.shown?.rect.x).toBe(39);
		expect(marker.disposed).toBe(false);
	});

	it('can start hidden before the first cursor snapshot', () => {
		const marker = new FakeMarker();
		const view = new Playhead(marker);
		view.setVisible(false);
		view.render(changeAt(new Rect(10, 0, 1, 100)));
		expect(marker.shows).toBe(0);
		view.setVisible(true);
		expect(marker.shows).toBe(1);
	});

	it('honors color and width options', () => {
		const marker = new FakeMarker();
		const view = new Playhead(marker, { color: 'red', widthPx: 4 });
		view.render(changeAt(new Rect(10, 5, 1, 80)));
		expect(marker.shown).toEqual({
			rect: new Rect(8, 5, 4, 80),
			color: 'red',
		});
	});

	it('redraws the current bar at a new width, and draws later bars at it', () => {
		const marker = new FakeMarker();
		const view = new Playhead(marker);
		view.setWidthPx(6);
		expect(marker.shows).toBe(0);
		view.render(changeAt(new Rect(10, 0, 1, 100)));
		expect(marker.shown?.rect).toEqual(new Rect(7, 0, 6, 100));
		view.setWidthPx(4);
		expect(marker.shown?.rect).toEqual(new Rect(8, 0, 4, 100));
	});

	it('moves its marker on each render and disposes it', () => {
		const marker = new FakeMarker();
		const view = new Playhead(marker);
		view.render(changeAt(new Rect(10, 0, 1, 100)));
		view.render(changeAt(new Rect(20, 0, 1, 100)));
		expect(marker.shown?.rect.x).toBe(19);
		view.dispose();
		expect(marker.disposed).toBe(true);
	});
});
