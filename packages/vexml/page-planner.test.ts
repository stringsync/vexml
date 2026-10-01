import { describe, expect, it } from 'bun:test';
import { PagePlanner } from './page-planner';

// 100px pages with 10px margins leave 80px for systems, from y 10 to 90 on the first page.
const planner = new PagePlanner(100, 10);

describe('PagePlanner', () => {
	it('crops the drawing so the first system starts at the top margin', () => {
		const plan = planner.plan([{ top: 250, bottom: 280 }]);
		expect(plan.cropTop).toBe(240);
		expect(plan.pushes.size).toBe(0);
		expect(plan.pageCount).toBe(1);
	});

	it('keeps systems that fit on one page where they are', () => {
		const plan = planner.plan([
			{ top: 0, bottom: 30 },
			{ top: 40, bottom: 80 },
		]);
		expect(plan.pushes.size).toBe(0);
		expect(plan.pageCount).toBe(1);
	});

	it('moves a system that would cross the bottom margin to the top of the next page', () => {
		const plan = planner.plan([
			{ top: 0, bottom: 30 },
			{ top: 40, bottom: 70 },
			{ top: 80, bottom: 110 },
		]);
		// The third system's top lands at 90 and must start the next page at 110.
		expect([...plan.pushes]).toEqual([[2, 20]]);
		expect(plan.pageCount).toBe(2);
	});

	it('carries a push down to the systems after it', () => {
		const plan = planner.plan([
			{ top: 0, bottom: 70 },
			{ top: 80, bottom: 150 },
			{ top: 160, bottom: 230 },
		]);
		// Each system fills a page: the second moves from 90 to 110, which puts the third at 190,
		// and it moves on to 210.
		expect([...plan.pushes]).toEqual([
			[1, 20],
			[2, 20],
		]);
		expect(plan.pageCount).toBe(3);
	});

	it('lets a system taller than a page start its page and run past it', () => {
		const plan = planner.plan([
			{ top: 0, bottom: 20 },
			{ top: 30, bottom: 180 },
			{ top: 190, bottom: 210 },
		]);
		// The tall system moves to the second page's top and ends at 260, on the third page; the
		// next system follows it there without a push.
		expect([...plan.pushes]).toEqual([[1, 70]]);
		expect(plan.pageCount).toBe(3);
	});

	it('plans one empty page when there are no systems', () => {
		expect(planner.plan([]).pageCount).toBe(1);
	});
});
