import { describe, expect, it } from 'bun:test';
import type { Box } from './engraving-ink';
import type { EngravedNote } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

describe('Behind Bars microtones: arrowed and fixed quarter-tone accidentals', () => {
	it.concurrent('draws arrowed and fixed quarter-tone accidentals', async () => {
		expect(await draw('microtones')).toMatchScreenshot(
			'engraving_microtones.png',
		);
	});

	it.concurrent('microtone-arrow-accidentals (p. 94): renders all six arrowed quarter-tone accidentals', async () => {
		const e = await engrave('microtones', 'microtone-arrow-accidentals');
		const notes = e.headsIn(0);
		const drawn = notes.map((n, i) => {
			const box = sign(n);
			markBox(e, box, `Arrow ${i + 1}`);
			return box.w > 0 && box.h >= n.space * 2;
		});
		expect(e.check(drawn)).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
			true,
		]);
	});

	it.concurrent('microtone-fixed-symbols (p. 96): renders all four standard fixed quarter-tone accidentals', async () => {
		const e = await engrave('microtones', 'microtone-fixed-symbols');
		const notes = e.headsIn(1);
		const drawn = notes.map((n, i) => {
			const box = sign(n);
			markBox(e, box, `Fixed ${i + 1}`);
			return box.w > 0 && box.h >= n.space * 1.5;
		});
		expect(e.check(drawn)).toMatchMeasurements([true, true, true, true]);
	});
});

function sign(note: EngravedNote): Box {
	const ink = must(note.ink, 'note ink');
	return { x: ink.x, y: ink.y, w: note.head.x - ink.x, h: ink.h };
}
