import { describe, expect, it } from 'bun:test';
import type { DocumentSystem } from './layout-planner';
import { PagePlanner, PageWalk } from './page-planner';

// 100px pages with 10px margins leave 80px for systems, from y 10 to 90 on the first page.
const planner = new PagePlanner(100, 10, 10);

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

	describe('following the document', () => {
		const system = (
			overrides: Partial<DocumentSystem> = {},
		): DocumentSystem => ({
			systemDistance: null,
			topSystemDistance: 5,
			lineTop: 0,
			startsPage: false,
			blankPages: 0,
			page: null,
			strict: false,
			fixedGaps: [],
			...overrides,
		});

		it('opens a page at the height and margins its system asks for', () => {
			const plan = planner.plan(
				[
					{ top: 20, bottom: 40 },
					{ top: 60, bottom: 80 },
					{ top: 100, bottom: 120 },
				],
				{
					lines: [
						{ top: 20, bottom: 40 },
						{ top: 60, bottom: 80 },
						{ top: 100, bottom: 120 },
					],
					systems: [
						system({ topSystemDistance: null }),
						system({
							topSystemDistance: null,
							startsPage: true,
							page: { height: 50, marginTop: 5, marginBottom: 5 },
						}),
						system({ topSystemDistance: null, startsPage: true }),
					],
				},
			);
			// Page 2 is 50 tall and starts at 100 with a 5 margin; page 3 starts at 150, default 10.
			expect(plan.pageHeights).toEqual([100, 50, 100]);
			expect(plan.pushes.get(1)).toBe(100 + 5 - 60 + 10);
		});

		it('puts the first top line its top-system-distance below the top margin', () => {
			const plan = planner.plan([{ top: 250, bottom: 280 }], {
				lines: [{ top: 260, bottom: 270 }],
				systems: [system()],
			});
			// The top line lands at 10 + 5: 245 is cropped.
			expect(plan.cropTop).toBe(245);
		});

		it('fits a system by its staff lines, letting its ink hang into the bottom margin', () => {
			const plan = planner.plan(
				[
					{ top: 0, bottom: 30 },
					{ top: 40, bottom: 98 },
				],
				{
					lines: [
						{ top: 15, bottom: 25 },
						{ top: 55, bottom: 85 },
					],
					systems: [system(), system()],
				},
			);
			expect(plan.pushes.size).toBe(0);
		});

		it('pushes a system opening a page to its top-system-distance', () => {
			const plan = planner.plan(
				[
					{ top: 0, bottom: 30 },
					{ top: 40, bottom: 100 },
				],
				{
					lines: [
						{ top: 15, bottom: 25 },
						{ top: 50, bottom: 95 },
					],
					systems: [system(), system({ topSystemDistance: 20 })],
				},
			);
			// The second top line, at 50, moves to 100 + 10 + 20.
			expect([...plan.pushes]).toEqual([[1, 80]]);
			expect(plan.pageCount).toBe(2);
		});

		it('starts a page where the document does, though the system fits', () => {
			const plan = planner.plan(
				[
					{ top: 0, bottom: 30 },
					{ top: 40, bottom: 50 },
				],
				{
					lines: [
						{ top: 15, bottom: 25 },
						{ top: 42, bottom: 48 },
					],
					systems: [system(), system({ startsPage: true })],
				},
			);
			expect([...plan.pushes]).toEqual([[1, 73]]);
		});

		it('leaves the blank pages the document asks for before a page it starts', () => {
			const plan = planner.plan(
				[
					{ top: 0, bottom: 30 },
					{ top: 40, bottom: 50 },
				],
				{
					lines: [
						{ top: 15, bottom: 25 },
						{ top: 42, bottom: 48 },
					],
					systems: [system(), system({ startsPage: true, blankPages: 2 })],
				},
			);
			// Two pages of 100 more than the plain page break.
			expect([...plan.pushes]).toEqual([[1, 273]]);
			expect(plan.pageCount).toBe(4);
		});
	});
});

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

	it('leaves one empty page when nothing was placed', () => {
		expect(new PageWalk(100, 10, 10).result()).toEqual({
			cropTop: 0,
			pageCount: 1,
			pageHeights: [100],
		});
	});
});
