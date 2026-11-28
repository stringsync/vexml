import { describe, expect, it } from 'bun:test';
import { Accidental, Formatter, StaveNote, Stem, Voice } from 'vexflow/core';
import { offsetAdjacentVoices, type VoiceTieEnds } from './voice-note-offset';

describe('offsetAlteredUnison', () => {
	it('keeps the tied voice left and places the entering accidental between the heads', () => {
		const up = makeNote('f/4', Stem.UP, 0, 'n');
		const down = makeNote('f/4', Stem.DOWN, 1);
		formatUnison(up, down, { starts: new Set(), stops: new Set([down]) });

		expect(down.getXShift()).toBe(0);
		expect(up.getXShift()).toBeGreaterThan(10);
		const nat = up.getModifiers()[0] as Accidental;
		// Placed to the right of the left head (positive xShift moves right).
		expect(nat.getXShift()).toBeGreaterThan(10);
		expect(up.getModifierContext()?.getLeftShift()).toBe(0);
	});

	it('separates both-altered unisons with each accidental beside its own head', () => {
		const up = makeNote('c/5', Stem.UP, 1, '#');
		const down = makeNote('c/5', Stem.DOWN, 0, 'n');
		formatUnison(up, down);

		expect(up.getXShift()).toBe(0);
		expect(down.getXShift()).toBeGreaterThan(10);
		const sharp = up.getModifiers()[0] as Accidental;
		const nat = down.getModifiers()[0] as Accidental;
		expect(sharp.getXShift()).toBeLessThan(0);
		expect(nat.getXShift()).toBeGreaterThan(10);
	});

	it('leaves a perfect unison sharing one head', () => {
		const up = makeNote('f/4', Stem.UP, 1, '#');
		const down = makeNote('f/4', Stem.DOWN, 1);
		formatUnison(up, down);

		expect(up.getXShift()).toBe(0);
		expect(down.getXShift()).toBe(0);
	});
});

type AlteredNote = StaveNote & { keyAlters?: readonly (number | undefined)[] };

function makeNote(
	key: string,
	stemDirection: number,
	alter: number,
	accidental?: string,
): AlteredNote {
	const note = new StaveNote({
		keys: [key],
		duration: 'h',
		stemDirection,
	}) as AlteredNote;
	note.keyAlters = [alter];
	for (const head of note.noteHeads) {
		(head as unknown as { width: number }).width = 10;
	}
	if (accidental) {
		const mod = new Accidental(accidental);
		(mod as unknown as { width: number }).width = 7;
		note.addModifier(mod, 0);
	}
	return note;
}

function formatUnison(
	up: AlteredNote,
	down: AlteredNote,
	ties?: VoiceTieEnds,
): void {
	const v1 = new Voice({ numBeats: 2, beatValue: 4 }).addTickables([up]);
	const v2 = new Voice({ numBeats: 2, beatValue: 4 }).addTickables([down]);
	new Formatter().joinVoices([v1, v2]);
	offsetAdjacentVoices([v1, v2], ties);
}
