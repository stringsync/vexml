import { describe, expect, it } from 'bun:test';
import { Stave, StaveNote } from 'vexflow/core';
import { PauseMark } from './pause-mark';

describe('PauseMark', () => {
	function noteOnStave(spacing = 10): { stave: Stave; note: StaveNote } {
		const stave = new Stave(20, 60, 240, {
			spacingBetweenLinesPx: spacing,
		});
		const note = new StaveNote({ keys: ['g/4'], duration: 'h' }).setStave(
			stave,
		);
		return { stave, note };
	}

	it('places a default caesura from the second stave-line down up to the first ledger line above', () => {
		const { stave, note } = noteOnStave(10);
		const mark = new PauseMark('caesura');
		note.addModifier(mark);
		mark.setDrawX(200);

		const box = mark.getBoundingBox();
		const topLine = stave.getYForLine(0);
		const secondLine = stave.getYForLine(1);
		expect(box.getX()).toBe(200);
		expect(box.getY() + box.getH()).toBeCloseTo(secondLine, 1);
		expect(box.getY()).toBeCloseTo(topLine - 11.3, 1);
	});

	it('places a default breath comma just above the top stave line', () => {
		const { stave, note } = noteOnStave(10);
		const mark = new PauseMark('breath-mark');
		note.addModifier(mark);
		mark.setDrawX(150);

		const box = mark.getBoundingBox();
		const topLine = stave.getYForLine(0);
		expect(box.getX()).toBe(150);
		expect(box.getY() + box.getH()).toBeCloseTo(topLine - 2.5, 1);
		expect(box.getY()).toBeCloseTo(topLine - 12.5, 1);
	});

	it('scales with staff line spacing and honours explicit below placement', () => {
		const { stave, note } = noteOnStave(8);
		const mark = new PauseMark('breath-mark', 'below');
		note.addModifier(mark);
		mark.setDrawX(120);

		const box = mark.getBoundingBox();
		const bottomLine = stave.getYForLine(4);
		expect(box.getY()).toBeCloseTo(bottomLine + 2, 1);
		expect(box.getH()).toBeCloseTo(8, 1);
	});
});
