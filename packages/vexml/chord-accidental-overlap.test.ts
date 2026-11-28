import { describe, expect, it } from 'bun:test';
import { Accidental, Formatter, Stave, StaveNote, Voice } from 'vexflow/core';
import { tuckChordAccidentals } from './chord-accidental-overlap';

describe('tuckChordAccidentals', () => {
	it('tucks two flats a fifth apart to 0.56 stave spaces', () => {
		const { signs } = formatChord(
			['e/4', 'b/4'],
			[{ type: 'b' }, { type: 'b' }],
		);
		expect(leftEdgeOffset(signs)).toBeCloseTo(5.6, 5);
	});

	it('keeps naturals a fourth apart clear of each other', () => {
		const { signs } = formatChord(
			['f/4', 'b/4'],
			[{ type: 'n' }, { type: 'n' }],
		);
		expect(leftEdgeOffset(signs)).toBeGreaterThanOrEqual(10);
	});

	it('leaves fourths, mixed signs, sharps, thirds, and cautionary flats untouched', () => {
		const { signs: flatFourth } = formatChord(
			['f/4', 'b/4'],
			[{ type: 'b' }, { type: 'b' }],
		);
		expect(leftEdgeOffset(flatFourth)).toBeGreaterThanOrEqual(10);

		const { signs: mixed5 } = formatChord(
			['e/4', 'b/4'],
			[{ type: 'n' }, { type: 'b' }],
		);
		expect(leftEdgeOffset(mixed5)).toBeGreaterThanOrEqual(10);

		const { signs: sharps } = formatChord(
			['g/4', 'd/5'],
			[{ type: '#' }, { type: '#' }],
		);
		expect(leftEdgeOffset(sharps)).toBeGreaterThanOrEqual(10);

		const { signs: cautionary } = formatChord(
			['e/4', 'b/4'],
			[
				{ type: 'b', cautionary: true },
				{ type: 'b', cautionary: true },
			],
		);
		expect(leftEdgeOffset(cautionary)).toBeGreaterThanOrEqual(10);
	});
});

const SIGN_WIDTH: Record<string, number> = { b: 9, n: 7 };

function formatChord(
	keys: string[],
	accidentals: Array<{ type: string; cautionary?: boolean }>,
): { note: StaveNote; signs: Accidental[]; leftShift: number } {
	const stave = new Stave(0, 0, 200);
	const note = new StaveNote({ keys, duration: 'h' });
	const signs = accidentals.map(({ type, cautionary }, index) => {
		const acc = new Accidental(type);
		if (cautionary) {
			acc.setAsCautionary();
		}
		acc.setWidth(SIGN_WIDTH[type] ?? 10);
		note.addModifier(acc, index);
		return acc;
	});
	note.setStave(stave);
	const voice = new Voice({ numBeats: 2, beatValue: 4 }).addTickables([note]);
	voice.setStave(stave);
	const formatter = new Formatter().joinVoices([voice]);
	tuckChordAccidentals([voice]);
	formatter.preCalculateMinTotalWidth([voice]);
	const leftShift = note.getModifierContext()?.getLeftShift() ?? 0;
	return { note, signs, leftShift };
}

function leftEdgeOffset(signs: Accidental[]): number {
	const [lower, upper] = signs;
	if (!lower || !upper) {
		throw new Error('expected two accidentals');
	}
	return (
		-lower.getXShift() +
		lower.getWidth() -
		(-upper.getXShift() + upper.getWidth())
	);
}
