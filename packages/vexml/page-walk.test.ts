import { describe, expect, it } from 'bun:test';
import { PageWalk } from './page-walk';

describe('PageWalk', () => {
	it('answers each system with its push as the earlier pushes have placed it', () => {
		const walk = new PageWalk(100, 10, 10);
		expect(walk.place({ top: 0, bottom: 30 })).toBe(0);
		expect(walk.place({ top: 40, bottom: 120 })).toBe(60);
		// The next system is drawn below the pushed one, so it needs no push of its own.
		expect(walk.place({ top: 130, bottom: 140 })).toBe(0);
		expect(walk.result()).toEqual({
			cropTop: -10,
			pageCount: 2,
			pageHeights: [100, 100],
		});
	});

	it('reports the page each system starts on', () => {
		const walk = new PageWalk(100, 10, 10);
		walk.place({ top: 0, bottom: 30 });
		expect(walk.placedPage()).toBe(0);
		walk.place({ top: 40, bottom: 120 });
		expect(walk.placedPage()).toBe(1);
	});

	it('leaves one empty page when nothing was placed', () => {
		expect(new PageWalk(100, 10, 10).result()).toEqual({
			cropTop: 0,
			pageCount: 1,
			pageHeights: [100],
		});
	});
});
