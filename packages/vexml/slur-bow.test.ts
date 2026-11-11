import { describe, expect, it } from 'bun:test';
import { StaveNote } from 'vexflow/core';
import { SLUR_TIE_GAP } from './constants';
import { SlurBow } from './slur-bow';
import { SlurObstacles } from './slur-obstacles';

const note = (stemDirection: number) =>
	new StaveNote({
		keys: ['a/4'],
		duration: 'q',
		stemDirection,
	});

const bowOf = (opts: {
	from: StaveNote;
	to: StaveNote;
	bulgeUp: boolean;
	tiedFrom?: boolean;
	tiedTo?: boolean;
}) =>
	new SlurBow(new SlurObstacles(), {
		isGrace: false,
		crossStave: false,
		mayGhost: false,
		ghost: false,
		tiedFrom: false,
		tiedTo: false,
		...opts,
	});

describe('SlurBow tieLift', () => {
	it('lifts a tied end whose tie bows on the slur side, the notehead side of a stem-up note', () => {
		const from = note(1);
		const to = note(1);
		const bow = bowOf({ from, to, bulgeUp: false, tiedFrom: true });
		expect(bow.tieLift(from)).toBe(SLUR_TIE_GAP);
	});

	it('leaves an end with no tie alone', () => {
		const from = note(1);
		const to = note(1);
		const bow = bowOf({ from, to, bulgeUp: false, tiedFrom: true });
		expect(bow.tieLift(to)).toBe(0);
	});

	it('leaves a tied end alone when the slur bows on the other side of the tie', () => {
		const from = note(1);
		const to = note(1);
		const bow = bowOf({ from, to, bulgeUp: true, tiedFrom: true });
		expect(bow.tieLift(from)).toBe(0);
	});
});
