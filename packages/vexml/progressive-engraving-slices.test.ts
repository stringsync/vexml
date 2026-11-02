import { beforeEach, describe, expect, it } from 'bun:test';
import { DEFAULT_PANORAMIC_LAYOUT } from './config';
import {
	FOOTER,
	FOOTER_TEXT,
	LONG,
	NARROW,
	render,
	stavesOf,
	TIE_ACROSS_BREAK,
	textOpsOf,
	wholeLong,
} from './progressive-engraving-harness';

describe('ProgressiveEngraving', () => {
	let whole: Awaited<ReturnType<typeof wholeLong>>;

	beforeEach(async () => {
		whole = await wholeLong();
	});

	it('draws the footer under the last system, whole and progressively', async () => {
		const whole = await render(FOOTER, { showHeader: true });
		const { stage, scheduler } = await render(FOOTER, {
			showHeader: true,
			progressive: true,
		});
		scheduler.runAll();

		expect(textOpsOf(whole.stage.engravings[0], FOOTER_TEXT)).toHaveLength(1);
		expect(stage.engravings.at(-1)?.ops).toEqual(
			whole.stage.engravings[0]?.ops ?? [],
		);
	});

	it('finds nothing under a pointer over an undrawn system', async () => {
		const { score } = await render(LONG, { progressive: true });
		const box = whole.score.getSystems().at(-1)?.getMeasureBoxes().at(-1);
		expect(box).toBeDefined();
		const point = {
			x: (box?.rect.x ?? 0) + (box?.rect.w ?? 0) / 2,
			y: (box?.rect.y ?? 0) + (box?.rect.h ?? 0) / 2,
		};

		expect(whole.score.getElements().at(point)).not.toBeNull();
		expect(score.getElements().at(point)).toBeNull();
		expect(score.getTimeAt(point)).toBeNull();
	});

	it('cancels the pending slice on dispose, and a late slice does nothing', async () => {
		const { score, scheduler } = await render(LONG, { progressive: true });
		let completes = 0;
		score.events.on('complete', () => completes++);

		score.dispose();

		expect(scheduler.pending).toBe(0);
		expect(() => scheduler.runAll()).not.toThrow();
		expect(completes).toBe(0);
	});

	it('draws a tie across a system break whole, each half with its system', async () => {
		const whole = await render(TIE_ACROSS_BREAK, { layout: NARROW });
		// A view too short for a second system: the tie's end waits for a slice.
		const { score, stage, scheduler } = await render(
			TIE_ACROSS_BREAK,
			{ progressive: true, layout: NARROW },
			0,
		);
		expect(score.getSystems().length).toBeGreaterThan(1);
		expect(score.isComplete()).toBe(false);

		scheduler.runAll();

		expect(stage.engravings.at(-1)?.ops).toEqual(
			whole.stage.engravings[0]?.ops ?? [],
		);
	});

	it('draws whatever is left before taking a snapshot', async () => {
		const { score } = await render(LONG, { progressive: true });

		const snapshot = score.snapshot();

		expect(score.isComplete()).toBe(true);
		expect(snapshot.engraving).toEqual(whole.score.snapshot().engraving);
	});

	it('gives each measure the lines of its staves, in score space', async () => {
		const { score } = await wholeLong();
		const [voice, piano] = score.getParts();
		const box = voice?.getMeasures()[0]?.getBox();

		const [stave] = voice?.getMeasures()[0]?.getStaves() ?? [];
		const lines = stave?.getLineYs() ?? [];
		expect(stave?.getNumber()).toBe(1);
		expect(lines).toHaveLength(5);
		expect(
			new Set(lines.slice(1).map((y, i) => y - (lines[i] ?? 0))).size,
		).toBe(1);
		expect(box?.rect.containsRect(stave?.getRect() ?? box.rect)).toBe(true);
		expect(stave?.getNoteStartX()).toBeGreaterThan(stave?.getRect().x ?? 0);
		expect(
			piano
				?.getMeasures()[0]
				?.getStaves()
				.map((s) => s.getNumber()),
		).toEqual([1, 2]);
	});

	it("places each measure's staves as its system is drawn", async () => {
		const { score, scheduler } = await render(LONG, { progressive: true });
		const last = score.getParts()[0]?.getMeasures().at(-1);

		expect(last?.getStaves()).toEqual([]);
		scheduler.runAll();
		expect(stavesOf(score)).toEqual(stavesOf(whole.score));
	});

	it('keeps the staves in a snapshot', async () => {
		const { score } = await render(
			JSON.parse(JSON.stringify(whole.score.snapshot())),
		);

		expect(stavesOf(score)).toEqual(stavesOf(whole.score));
	});

	it('draws a panoramic layout whole', async () => {
		const { score, scheduler } = await render(LONG, {
			progressive: true,
			layout: DEFAULT_PANORAMIC_LAYOUT,
		});

		expect(score.isComplete()).toBe(true);
		expect(scheduler.pending).toBe(0);
	});
});
