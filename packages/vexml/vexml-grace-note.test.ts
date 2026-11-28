import { describe, expect, it } from 'bun:test';
import { Beam, GraceNote, Stave, Stem, TickContext } from 'vexflow/core';
import { VexmlGraceNote } from './vexml-grace-note';

function placeOnStave(
	note: GraceNote,
	stave = new Stave(0, 40, 200),
	x = 50,
): Stave {
	note.setStave(stave);
	new TickContext().addTickable(note).preFormat().setX(x);
	return stave;
}

describe('VexmlGraceNote', () => {
	it('lengthens an up-stem slashed grace note on lower ledger lines so its slash clears the top ledger line', () => {
		const note = new VexmlGraceNote({
			keys: ['a/3'],
			duration: '8',
			clef: 'treble',
			slash: true,
		});
		const stave = placeOnStave(note);
		const stock = new GraceNote({
			keys: ['a/3'],
			duration: '8',
			clef: 'treble',
			slash: true,
		});
		placeOnStave(stock, stave);

		expect(note.getStemExtension()).toBeGreaterThan(stock.getStemExtension());
		const slash = note.getSlash();
		if (!slash) {
			throw new Error('expected slash');
		}
		const topLowerLedgerY = stave.getYForLine(5);
		expect(Math.max(slash.y1, slash.y2)).toBeLessThan(topLowerLedgerY);
	});

	it('lengthens a down-stem slashed grace note on upper ledger lines so its slash clears the bottom ledger line', () => {
		const note = new VexmlGraceNote({
			keys: ['c/6'],
			duration: '8',
			clef: 'treble',
			stemDirection: Stem.DOWN,
			slash: true,
		});
		const stave = placeOnStave(note);

		const slash = note.getSlash();
		if (!slash) {
			throw new Error('expected slash');
		}
		const bottomUpperLedgerY = stave.getYForLine(-1);
		expect(Math.min(slash.y1, slash.y2)).toBeGreaterThan(bottomUpperLedgerY);
	});

	it('leaves non-ledger and unslashed grace notes identical to stock GraceNote', () => {
		const inStaff = new VexmlGraceNote({
			keys: ['f/4'],
			duration: '8',
			clef: 'treble',
			slash: true,
		});
		const stockInStaff = new GraceNote({
			keys: ['f/4'],
			duration: '8',
			clef: 'treble',
			slash: true,
		});
		const stave = placeOnStave(inStaff);
		placeOnStave(stockInStaff, stave);

		expect(inStaff.getStemExtension()).toBe(stockInStaff.getStemExtension());
		expect(inStaff.getSlash()).toEqual(stockInStaff.getSlash());

		const unslashedLedger = new VexmlGraceNote({
			keys: ['a/3'],
			duration: '8',
			clef: 'treble',
			slash: false,
		});
		const stockUnslashed = new GraceNote({
			keys: ['a/3'],
			duration: '8',
			clef: 'treble',
			slash: false,
		});
		placeOnStave(unslashedLedger, stave);
		placeOnStave(stockUnslashed, stave);

		expect(unslashedLedger.getStemExtension()).toBe(
			stockUnslashed.getStemExtension(),
		);
		expect(unslashedLedger.getSlash()).toBeUndefined();
	});

	it('draws a clear diagonal stroke crossing below the full beam stack on a slashed beamed grace group', () => {
		const stave = new Stave(0, 40, 200);
		const notes = ['d/4', 'e/4', 'f/4'].map(
			(key, i) =>
				new VexmlGraceNote({
					keys: [key],
					duration: '16',
					clef: 'treble',
					slash: i === 0,
				}),
		);
		notes.forEach((n, i) => {
			placeOnStave(n, stave, 50 + i * 12);
		});
		const beam = new Beam(notes);
		beam.renderOptions.beamWidth = 3;
		beam.postFormat();

		const first = notes[0];
		const slash = first?.getSlash();
		if (!first || !slash) {
			throw new Error('expected beamed slash');
		}
		const beamTopY = beam.getBeamYToDraw();
		const beamBottomY = beamTopY + 3 * (1.5 * beam.getBeamCount() - 0.5);
		// Crosses from below the lowest beam (left of first stem) to above the top beam (right of first stem).
		expect(slash.y1).toBeGreaterThan(beamBottomY);
		expect(slash.y2).toBeLessThan(beamTopY);
		expect(slash.x1).toBeLessThan(first.getStemX());
		expect(slash.x2).toBeGreaterThan(first.getStemX());
	});
});
