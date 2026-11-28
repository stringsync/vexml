import { describe, expect, it } from 'bun:test';
import {
	Articulation,
	GraceNote,
	Modifier,
	Stave,
	StaveNote,
} from 'vexflow/core';
import { SLUR_NESTED_END_GAP, SLUR_TIE_GAP } from './constants';
import { SlurBow } from './slur-bow';
import { SlurObstacles } from './slur-obstacles';

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

describe('SlurBow nestedLift', () => {
	it('returns each end lift for its matching note and zero otherwise', () => {
		const from = note(-1);
		const to = note(-1);
		const other = note(-1);
		const bow = bowOf({
			from,
			to,
			bulgeUp: true,
			nestedLiftFrom: SLUR_NESTED_END_GAP,
		});
		expect(bow.nestedLift(from)).toBe(SLUR_NESTED_END_GAP);
		expect(bow.nestedLift(to)).toBe(0);
		expect(bow.nestedLift(other)).toBe(0);
	});
});

describe('SlurBow atStemTip', () => {
	it('is true when the stem points toward the bulge and tips are level', () => {
		const from = note(1);
		const to = note(1);
		const bow = bowOf({ from, to, bulgeUp: true });
		expect(bow.atStemTip(from)).toBe(true);
		expect(bow.atStemTip(to)).toBe(true);
	});

	it('is false when the slur bows on the notehead side', () => {
		const from = note(1);
		const to = note(1);
		const bow = bowOf({ from, to, bulgeUp: false });
		expect(bow.atStemTip(from)).toBe(false);
	});

	it('is false on a stemless note', () => {
		const from = new StaveNote({ keys: ['a/4'], duration: 'w' });
		const to = new StaveNote({ keys: ['a/4'], duration: 'w' });
		const bow = bowOf({ from, to, bulgeUp: true });
		expect(bow.atStemTip(from)).toBe(false);
	});
});

describe('SlurBow hasTenuto', () => {
	it('is true when a tenuto sits on the bulge side and false for other marks or the opposite side', () => {
		const withTenuto = note(1);
		withTenuto.addModifier(
			new Articulation('a-').setPosition(Modifier.Position.ABOVE),
		);
		const withStaccato = note(1);
		withStaccato.addModifier(
			new Articulation('a.').setPosition(Modifier.Position.ABOVE),
		);
		const bowUp = bowOf({ from: withTenuto, to: withStaccato, bulgeUp: true });
		expect(bowUp.hasTenuto(withTenuto)).toBe(true);
		expect(bowUp.hasTenuto(withStaccato)).toBe(false);

		const bowDown = bowOf({
			from: withTenuto,
			to: withStaccato,
			bulgeUp: false,
		});
		expect(bowDown.hasTenuto(withTenuto)).toBe(false);
	});
});

describe('SlurBow grace anchorY', () => {
	const stave = new Stave(0, 0, 200);
	const onStave = <T extends StaveNote>(n: T): T => n.setStave(stave);

	it('anchors a single-voice below grace slur notehead-to-notehead even on a down-stem main note', () => {
		const grace = onStave(
			new GraceNote({ keys: ['d/5'], duration: '8', stemDirection: 1 }),
		);
		const main = onStave(
			new StaveNote({ keys: ['c/5'], duration: 'h', stemDirection: -1 }),
		);
		const bow = bowOf({ from: grace, to: main, bulgeUp: false, isGrace: true });
		expect(bow.anchorY(grace)).toBe(grace.getNoteHeadBounds().yBottom);
		expect(bow.anchorY(main)).toBe(main.getNoteHeadBounds().yBottom);
	});

	it('anchors a grace note at its stem tip when the stem points toward the bulge, while keeping the main note on its notehead', () => {
		const upGrace = onStave(
			new GraceNote({ keys: ['f/5'], duration: '8', stemDirection: 1 }),
		);
		const chord = onStave(
			new StaveNote({
				keys: ['a/4', 'c/5', 'e/5'],
				duration: 'h',
				stemDirection: -1,
			}),
		);
		const aboveBow = bowOf({
			from: upGrace,
			to: chord,
			bulgeUp: true,
			isGrace: true,
		});
		expect(aboveBow.anchorY(upGrace)).toBe(upGrace.getStemExtents().topY);
		expect(aboveBow.anchorY(chord)).toBe(chord.getNoteHeadBounds().yTop);

		const downGrace = onStave(
			new GraceNote({ keys: ['a/4'], duration: '8', stemDirection: -1 }),
		);
		const whole = onStave(new StaveNote({ keys: ['g/4'], duration: 'w' }));
		const belowBow = bowOf({
			from: downGrace,
			to: whole,
			bulgeUp: false,
			isGrace: true,
		});
		expect(belowBow.anchorY(downGrace)).toBe(downGrace.getStemExtents().topY);
		expect(belowBow.anchorY(whole)).toBe(whole.getNoteHeadBounds().yBottom);
	});
});

interface BowInput {
	from: StaveNote;
	to: StaveNote;
	bulgeUp: boolean;
	isGrace?: boolean;
	tiedFrom?: boolean;
	tiedTo?: boolean;
	nestedLiftFrom?: number;
	nestedLiftTo?: number;
}

function note(stemDirection: number): StaveNote {
	return new StaveNote({
		keys: ['a/4'],
		duration: 'q',
		stemDirection,
	});
}

function bowOf(opts: BowInput): SlurBow {
	return new SlurBow(new SlurObstacles(), {
		isGrace: false,
		crossStave: false,
		mayGhost: false,
		ghost: false,
		tiedFrom: false,
		tiedTo: false,
		...opts,
	});
}
