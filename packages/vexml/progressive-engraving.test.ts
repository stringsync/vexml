import { beforeEach, describe, expect, it } from 'bun:test';
import { DEFAULT_STANDARD_LAYOUT } from './config';
import {
	boxesOf,
	cursorRectAt,
	LONG,
	render,
	stepsOf,
	straySystemsOf,
	textOpsOf,
	wholeLong,
} from './progressive-engraving-harness';
import type { Score } from './score';

describe('ProgressiveEngraving', () => {
	let score: Score;
	let lastMs: number;
	let stage: Awaited<ReturnType<typeof render>>['stage'];
	let scheduler: Awaited<ReturnType<typeof render>>['scheduler'];
	let whole: Awaited<ReturnType<typeof wholeLong>>;

	beforeEach(async () => {
		whole = await wholeLong();
		({ score, stage, scheduler } = await render(LONG, { progressive: true }));
		lastMs = score.getDurationMs() - 1;
	});

	it('resolves render() with the first screen drawn and the rest pending', async () => {
		expect(score.isComplete()).toBe(false);
		expect(scheduler.pending).toBe(1);
		expect(stage.shownSystems()).toBeLessThan(whole.score.getSystems().length);
		expect(score.getMeasureCount()).toBe(whole.score.getMeasureCount());
		expect(score.getDurationMs()).toBe(whole.score.getDurationMs());
		expect(score.getSequence().length).toBe(whole.score.getSequence().length);
	});

	it("draws the rest in slices, naming each slice's systems in a draw event, then completes", async () => {
		const drawn: number[][] = [];
		let completes = 0;
		score.events.on('draw', (e) => drawn.push([...e.systems]));
		score.events.on('complete', () => completes++);
		const settled = Promise.race([
			score.whenComplete().then(() => 'complete'),
			Promise.resolve('pending'),
		]);

		// A zero budget runs one piece of a system per slice: the first settles none, and each
		// event names exactly one.
		scheduler.run(0);
		expect(drawn).toEqual([]);
		expect(score.isComplete()).toBe(false);
		await expect(settled).resolves.toBe('pending');
		scheduler.runAll(0);
		expect(new Set(drawn.map((systems) => systems.length))).toEqual(
			new Set([1]),
		);

		const systems = drawn.flat();
		expect(systems).toEqual([...systems].sort((a, b) => a - b));
		expect(systems.at(-1)).toBe(score.getSystems().length - 1);
		expect(score.isComplete()).toBe(true);
		expect(completes).toBe(1);
		expect(scheduler.pending).toBe(0);
		await score.whenComplete();
	});

	it('spends an idle slice on as many systems as its budget holds', async () => {
		const drawn: number[][] = [];
		score.events.on('draw', (e) => drawn.push([...e.systems]));

		scheduler.run(Number.POSITIVE_INFINITY);

		expect(drawn).toHaveLength(1);
		expect(score.isComplete()).toBe(true);
	});

	it('matches a whole render once complete: ops, element boxes and step geometry', async () => {
		scheduler.runAll();

		const engraving = stage.engravings.at(-1);
		expect(engraving?.ops).toEqual(whole.stage.engravings[0]?.ops ?? []);
		expect(engraving?.height).toBe(whole.stage.engravings[0]?.height ?? -1);
		expect(boxesOf(score)).toEqual(boxesOf(whole.score));
		expect(stepsOf(score)).toEqual(stepsOf(whole.score));
		expect(score.getElements().all().length).toBe(
			whole.score.getElements().all().length,
		);
	});

	it('shows the stage only the ops each system adds', async () => {
		scheduler.runAll();

		expect(stage.extensions.slice(1).map((e) => e.from)).toEqual(
			stage.extensions.slice(0, -1).map((e) => e.engraving.ops.length),
		);
	});

	it('places a cursor moved onto an undrawn system where a whole render would', async () => {
		const expected = cursorRectAt(whole.score, lastMs);

		const before = score.isComplete();
		const rect = cursorRectAt(score, lastMs);

		expect(before).toBe(false);
		expect(rect).toEqual(expected);
		expect(score.isComplete()).toBe(true);
		scheduler.runAll();
		expect(scheduler.pending).toBe(0);
	});

	// vet-ignore simple-test-setup: the pause steps are shared with one other test, and a beforeEach would run them for all.
	it('pauses a system part way through, showing none of it until a cursor moved past finishes it', async () => {
		const shown = stage.shownSystems();
		// The plan's piece, then the next system's draw.
		scheduler.run(0);
		scheduler.run(0);
		const paused = stage.extensions.length;
		const rect = cursorRectAt(score, lastMs);
		scheduler.runAll();

		expect(paused).toBe(shown);
		expect(rect).toEqual(cursorRectAt(whole.score, lastMs));
		expect(stage.engravings.at(-1)?.ops).toEqual(
			whole.stage.engravings[0]?.ops ?? [],
		);
		expect(boxesOf(score)).toEqual(boxesOf(whole.score));
		expect(stepsOf(score)).toEqual(stepsOf(whole.score));
	});

	it('forecasts the undrawn systems, keeping every column on a system until the count settles', async () => {
		const counts = [score.getSystems().length];
		const strays = straySystemsOf(score);
		// A zero budget settles one system per event: the systems are checked after each.
		score.events.on('draw', () => {
			counts.push(score.getSystems().length);
			strays.push(...straySystemsOf(score));
		});
		scheduler.runAll(0);

		// The forecast moves the count as the plan lands; the drawn systems hold it afterwards.
		expect(strays).toEqual([]);
		expect(new Set(counts).size).toBeGreaterThan(1);
		expect(counts.at(-1)).toBe(whole.score.getSystems().length);
		expect(boxesOf(score)).toEqual(boxesOf(whole.score));
	});

	it('widens the page when a later system is wider, drawing the header again across it', async () => {
		// Too narrow for the score's widest measures: a system planned after the first screen
		// widens the page, which a whole render knew from the start.
		const layout = { ...DEFAULT_STANDARD_LAYOUT, referenceWidth: 200 };
		const whole = await render(LONG, { layout });
		const { stage, scheduler } = await render(LONG, {
			progressive: true,
			layout,
		});
		const firstScreen = stage.engravings.at(-1);
		scheduler.runAll();

		// The systems drawn before the page widened keep their draw, so only the header, drawn
		// again, and the page are the whole render's.
		const final = stage.engravings.at(-1);
		expect(firstScreen?.width).toBeLessThan(final?.width ?? 0);
		expect(final?.width).toBe(whole.stage.engravings[0]?.width ?? -1);
		expect(textOpsOf(final, 'Gute Nacht')).toEqual(
			textOpsOf(whole.stage.engravings[0], 'Gute Nacht'),
		);
	});
});
